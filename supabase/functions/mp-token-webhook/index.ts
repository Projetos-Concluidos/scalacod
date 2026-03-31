import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("MP Token Webhook received:", JSON.stringify(body));

    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      return new Response("ok", { headers: corsHeaders });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return new Response("ok", { headers: corsHeaders });

    const mpToken = Deno.env.get("MP_PLATFORM_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("MP_PLATFORM_ACCESS_TOKEN not configured");
      return new Response("ok", { headers: corsHeaders });
    }

    // Fetch payment details
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    const payment = await paymentRes.json();
    console.log("Payment status:", payment.status, "ref:", payment.external_reference);

    if (payment.status !== "approved") return new Response("ok", { headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find pending token purchase
    const { data: purchase } = await supabase
      .from("token_purchases")
      .select("*")
      .eq("mp_payment_id", paymentId.toString())
      .eq("status", "pending")
      .maybeSingle();

    if (!purchase) {
      console.log("No pending purchase found for payment:", paymentId);
      return new Response("ok", { headers: corsHeaders });
    }

    // Credit tokens via secure function
    await supabase.rpc("add_tokens_to_user", {
      p_user_id: purchase.user_id,
      p_amount: purchase.tokens,
    });

    // Update purchase status
    await supabase.from("token_purchases").update({
      status: "paid",
      paid_at: new Date().toISOString(),
    }).eq("id", purchase.id);

    console.log(`Credited ${purchase.tokens} tokens to user ${purchase.user_id}`);

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error("mp-token-webhook error:", err);
    return new Response("ok", { headers: corsHeaders });
  }
});
