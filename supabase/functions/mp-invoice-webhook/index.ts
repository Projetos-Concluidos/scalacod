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
    console.log("MP Invoice Webhook:", JSON.stringify(body));

    // MercadoPago sends authorized_payment events for subscription invoices
    const isPayment =
      body.type === "subscription_authorized_payment" ||
      body.type === "payment" ||
      body.action?.includes("payment");

    if (!isPayment) {
      return new Response("ok", { headers: corsHeaders });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response("ok", { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const mpToken = Deno.env.get("MP_PLATFORM_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("MP_PLATFORM_ACCESS_TOKEN not set");
      return new Response("ok", { headers: corsHeaders });
    }

    // Fetch payment/authorized_payment details
    // Try authorized_payment endpoint first, fallback to regular payment
    let payment: Record<string, unknown> | null = null;

    if (body.type === "subscription_authorized_payment") {
      const authRes = await fetch(
        `https://api.mercadopago.com/authorized_payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${mpToken}` } }
      );
      if (authRes.ok) {
        payment = await authRes.json();
      } else {
        await authRes.text(); // consume body
      }
    }

    // Fallback: fetch as regular payment
    if (!payment) {
      const payRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${mpToken}` } }
      );
      if (!payRes.ok) {
        console.error("Failed to fetch payment:", payRes.status, await payRes.text());
        return new Response("ok", { headers: corsHeaders });
      }
      payment = await payRes.json();
    }

    console.log("Payment details:", JSON.stringify({
      status: payment.status,
      preapproval_id: payment.preapproval_id,
      amount: payment.transaction_amount,
    }));

    // Find subscription by preapproval_id
    const preapprovalId =
      (payment.preapproval_id as string) ||
      (payment.metadata as Record<string, string>)?.preapproval_id;

    if (!preapprovalId) {
      console.log("No preapproval_id found, skipping invoice sync");
      return new Response("ok", { headers: corsHeaders });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, user_id")
      .eq("mp_preapproval_id", preapprovalId)
      .maybeSingle();

    if (!subscription) {
      console.error("No subscription for preapproval:", preapprovalId);
      return new Response("ok", { headers: corsHeaders });
    }

    // Map payment status to invoice status
    const invoiceStatusMap: Record<string, string> = {
      approved: "paid",
      authorized: "paid",
      pending: "pending",
      in_process: "pending",
      rejected: "failed",
      cancelled: "failed",
      refunded: "refunded",
      charged_back: "refunded",
    };
    const invoiceStatus = invoiceStatusMap[payment.status as string] || "pending";

    // Upsert invoice by mp_payment_id
    const mpPaymentIdStr = paymentId.toString();

    const { data: existingInvoice } = await supabase
      .from("subscription_invoices")
      .select("id")
      .eq("mp_payment_id", mpPaymentIdStr)
      .maybeSingle();

    const invoiceData = {
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      mp_payment_id: mpPaymentIdStr,
      amount: (payment.transaction_amount as number) || 0,
      status: invoiceStatus,
      due_date: payment.date_of_expiration
        ? (payment.date_of_expiration as string).split("T")[0]
        : null,
      paid_at: invoiceStatus === "paid" ? new Date().toISOString() : null,
    };

    if (existingInvoice) {
      await supabase
        .from("subscription_invoices")
        .update(invoiceData)
        .eq("id", existingInvoice.id);
    } else {
      await supabase.from("subscription_invoices").insert(invoiceData);
    }

    // If payment approved, ensure subscription and profile are active
    if (invoiceStatus === "paid") {
      await supabase
        .from("subscriptions")
        .update({ status: "authorized", updated_at: new Date().toISOString() })
        .eq("id", subscription.id);

      await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.user_id);

      // Notify user
      await supabase.from("notifications").insert({
        user_id: subscription.user_id,
        title: "Pagamento confirmado ✅",
        body: `Pagamento de R$ ${((payment.transaction_amount as number) || 0).toFixed(2)} recebido.`,
        type: "success",
      });
    } else if (invoiceStatus === "failed") {
      await supabase
        .from("profiles")
        .update({
          subscription_status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.user_id);

      await supabase.from("notifications").insert({
        user_id: subscription.user_id,
        title: "Falha no pagamento ⚠️",
        body: "Seu pagamento não foi aprovado. Verifique seu cartão.",
        type: "warning",
      });
    }

    console.log("Invoice synced:", mpPaymentIdStr, "→", invoiceStatus);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mp-invoice-webhook error:", err);
    return new Response("ok", { headers: corsHeaders });
  }
});
