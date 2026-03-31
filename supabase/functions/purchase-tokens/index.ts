import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_PACKS: Record<string, { tokens: number; amount: number; name: string }> = {
  starter: { tokens: 5000, amount: 19.90, name: "Pack Iniciante" },
  essencial: { tokens: 10000, amount: 39.90, name: "Pack Essencial" },
  profissional: { tokens: 50000, amount: 197.00, name: "Pack Profissional" },
  enterprise: { tokens: 100000, amount: 397.00, name: "Pack Enterprise" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Não autorizado");

    const { packId, paymentMethod, cardToken, payerEmail } = await req.json();

    if (!packId || !TOKEN_PACKS[packId]) {
      return new Response(JSON.stringify({ error: "Pack inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymentMethod || !["pix", "credit_card"].includes(paymentMethod)) {
      return new Response(JSON.stringify({ error: "Método de pagamento inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pack = TOKEN_PACKS[packId];
    const email = payerEmail || user.email;

    // Get platform MP token
    const mpToken = Deno.env.get("MP_PLATFORM_ACCESS_TOKEN");
    if (!mpToken) {
      return new Response(JSON.stringify({ error: "Pagamentos não configurados na plataforma" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idempotencyKey = `tokens-${user.id}-${packId}-${Date.now()}`;

    const paymentPayload: Record<string, unknown> = {
      transaction_amount: pack.amount,
      description: `ScalaNinja — ${pack.name} (${pack.tokens.toLocaleString("pt-BR")} tokens)`,
      external_reference: `tokens-${user.id}-${packId}-${Date.now()}`,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-token-webhook`,
      payer: { email },
    };

    if (paymentMethod === "pix") {
      paymentPayload.payment_method_id = "pix";
    } else if (paymentMethod === "credit_card") {
      if (!cardToken) {
        return new Response(JSON.stringify({ error: "Token do cartão é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      paymentPayload.token = cardToken;
      paymentPayload.installments = 1;
    }

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const payment = await mpRes.json();
    console.log("MP payment response:", payment.id, payment.status);

    if (payment.error) {
      return new Response(JSON.stringify({ error: payment.message || "Erro no MercadoPago" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record purchase
    await supabase.from("token_purchases").insert({
      user_id: user.id,
      pack_id: packId,
      tokens: pack.tokens,
      amount: pack.amount,
      mp_payment_id: payment.id?.toString(),
      status: payment.status === "approved" ? "paid" : "pending",
      paid_at: payment.status === "approved" ? new Date().toISOString() : null,
    });

    // If approved immediately (credit card), credit tokens
    if (payment.status === "approved") {
      await supabase.rpc("add_tokens_to_user", {
        p_user_id: user.id,
        p_amount: pack.tokens,
      });
    }

    return new Response(JSON.stringify({
      paymentId: payment.id,
      status: payment.status,
      pixQrCode: payment.point_of_interaction?.transaction_data?.qr_code_base64,
      pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code,
      tokensAmount: pack.tokens,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("purchase-tokens error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
