import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("store");

    const body = await req.json();
    console.log("MP Payment Webhook received:", JSON.stringify(body));

    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      return new Response("ok", { headers: corsHeaders });
    }

    const paymentId = body.data?.id;
    if (!paymentId || !storeId) {
      return new Response("ok", { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tenant's MP token
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("user_id", storeId)
      .eq("type", "mercadopago")
      .maybeSingle();

    if (!integration) {
      console.error("No MP integration for store:", storeId);
      return new Response("ok", { headers: corsHeaders });
    }

    const mpToken = (integration.config as any)?.access_token;
    if (!mpToken) {
      return new Response("ok", { headers: corsHeaders });
    }

    // Fetch payment details from MP
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    const payment = await paymentRes.json();

    console.log("Payment status:", payment.status, "for order ref:", payment.external_reference);

    const statusMap: Record<string, string> = {
      approved: "Aprovado",
      pending: "Aguardando",
      authorized: "Aguardando",
      in_process: "Aguardando",
      in_mediation: "Aguardando",
      rejected: "Cancelado",
      cancelled: "Cancelado",
      refunded: "Reembolsado",
      charged_back: "Reembolsado",
    };

    const newStatus = statusMap[payment.status] || "Aguardando";

    // Update order
    if (payment.external_reference) {
      await supabase.from("orders").update({
        status: newStatus,
        coinzz_order_hash: paymentId.toString(),
        payment_method: payment.payment_method_id || payment.payment_type_id,
        status_description: `MP: ${payment.status} - ${payment.status_detail || ""}`,
      }).eq("id", payment.external_reference);
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error("mp-payment-webhook error:", err);
    return new Response("ok", { headers: corsHeaders });
  }
});
