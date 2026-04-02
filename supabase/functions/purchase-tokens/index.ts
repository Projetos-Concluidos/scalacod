import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Não autorizado");

    const { packId, paymentMethod, cardToken, payerEmail } = await req.json();

    // Fetch pack from database by slug
    const { data: pack, error: packError } = await supabase
      .from("token_packs")
      .select("*")
      .eq("slug", packId)
      .eq("is_active", true)
      .maybeSingle();

    if (packError || !pack) {
      return new Response(JSON.stringify({ error: "Pack inválido ou inativo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymentMethod || !["pix", "credit_card"].includes(paymentMethod)) {
      return new Response(JSON.stringify({ error: "Método de pagamento inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = payerEmail || user.email;

    const mpToken = Deno.env.get("MP_PLATFORM_ACCESS_TOKEN");
    if (!mpToken) {
      return new Response(JSON.stringify({ error: "Pagamentos não configurados na plataforma" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idempotencyKey = `tokens-${user.id}-${pack.slug}-${Date.now()}`;

    const paymentPayload: Record<string, unknown> = {
      transaction_amount: Number(pack.price),
      description: `ScalaCOD — ${pack.name} (${pack.tokens.toLocaleString("pt-BR")} tokens)`,
      external_reference: `tokens-${user.id}-${pack.slug}-${Date.now()}`,
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

    await supabase.from("token_purchases").insert({
      user_id: user.id,
      pack_id: pack.slug,
      tokens: pack.tokens,
      amount: Number(pack.price),
      mp_payment_id: payment.id?.toString(),
      status: payment.status === "approved" ? "paid" : "pending",
      paid_at: payment.status === "approved" ? new Date().toISOString() : null,
    });

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
