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
    console.log("MP Subscription Webhook:", JSON.stringify(body));

    // MercadoPago sends preapproval events with type "subscription_preapproval"
    const isPreapproval =
      body.type === "subscription_preapproval" ||
      body.action?.startsWith("updated") ||
      body.action?.startsWith("created");

    if (!isPreapproval && body.type !== "subscription_preapproval") {
      return new Response("ok", { headers: corsHeaders });
    }

    const preapprovalId = body.data?.id;
    if (!preapprovalId) {
      return new Response("ok", { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get platform MP token for subscriptions
    const mpToken = Deno.env.get("MP_PLATFORM_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("MP_PLATFORM_ACCESS_TOKEN not set");
      return new Response("ok", { headers: corsHeaders });
    }

    // Fetch preapproval details from MercadoPago
    const res = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      { headers: { Authorization: `Bearer ${mpToken}` } }
    );

    if (!res.ok) {
      console.error("Failed to fetch preapproval:", res.status, await res.text());
      return new Response("ok", { headers: corsHeaders });
    }

    const preapproval = await res.json();
    console.log("Preapproval status:", preapproval.status, "payer:", preapproval.payer_email);

    // Map MP status to internal status
    const statusMap: Record<string, string> = {
      authorized: "authorized",
      pending: "pending",
      paused: "paused",
      cancelled: "cancelled",
      expired: "expired",
    };
    const internalStatus = statusMap[preapproval.status] || "pending";

    // Map MP status to profile subscription_status
    const profileStatusMap: Record<string, string> = {
      authorized: "active",
      pending: "trial",
      paused: "past_due",
      cancelled: "cancelled",
      expired: "inactive",
    };
    const profileStatus = profileStatusMap[preapproval.status] || "inactive";

    // Find subscription by mp_preapproval_id
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_id")
      .eq("mp_preapproval_id", preapprovalId.toString())
      .maybeSingle();

    if (!subscription) {
      console.error("No subscription found for preapproval:", preapprovalId);
      return new Response("ok", { headers: corsHeaders });
    }

    // Update subscription record
    const updateData: Record<string, unknown> = {
      status: internalStatus,
      updated_at: new Date().toISOString(),
      mp_payer_email: preapproval.payer_email || undefined,
    };

    if (preapproval.next_payment_date) {
      updateData.current_period_end = preapproval.next_payment_date;
    }
    if (preapproval.date_created) {
      updateData.current_period_start = preapproval.date_created;
    }
    if (preapproval.status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
    }

    await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscription.id);

    // Sync profile subscription_status
    await supabase
      .from("profiles")
      .update({
        subscription_status: profileStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.user_id);

    // Create notification for the user
    const notifTitles: Record<string, string> = {
      authorized: "Assinatura ativada! 🎉",
      paused: "Assinatura pausada ⚠️",
      cancelled: "Assinatura cancelada",
      expired: "Assinatura expirada",
    };
    const notifTitle = notifTitles[preapproval.status];
    if (notifTitle) {
      await supabase.from("notifications").insert({
        user_id: subscription.user_id,
        title: notifTitle,
        body: `Sua assinatura foi atualizada para: ${preapproval.status}`,
        type: preapproval.status === "authorized" ? "success" : "warning",
      });
    }

    console.log("Subscription synced:", subscription.id, "→", internalStatus);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mp-subscription-webhook error:", err);
    return new Response("ok", { headers: corsHeaders });
  }
});
