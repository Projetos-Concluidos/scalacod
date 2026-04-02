import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map Coinzz statuses → ScalaCOD statuses
const STATUS_MAP: Record<string, string> = {
  PENDING: "Aguardando",
  APPROVED: "Confirmado",
  WAITING_PAYMENT: "Aguardando",
  PROCESSING: "Em Separação",
  SHIPPED: "Em Trânsito",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Devolvido",
  REFUSED: "Cancelado",
  OVERDUE: "Inadimplente",
  IN_TRANSIT: "Em Trânsito",
  OUT_FOR_DELIVERY: "Saiu para Entrega",
};

function mapCoinzzStatus(coinzzStatus: string): string {
  return STATUS_MAP[coinzzStatus?.toUpperCase()] || STATUS_MAP[coinzzStatus] || coinzzStatus || "Aguardando";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit: 200 requests per 60 seconds
  const { limited } = await checkRateLimit(req, {
    action: "coinzz-webhook",
    windowSeconds: 60,
    maxAttempts: 200,
  });
  if (limited) return rateLimitResponse(corsHeaders, 60);

  try {
    const url = new URL(req.url);
    const storeUserId = url.searchParams.get("store");

    if (!storeUserId) {
      console.error("[coinzz-webhook] Missing store param");
      return new Response(JSON.stringify({ error: "Missing store param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("[coinzz-webhook] Received:", JSON.stringify(body).substring(0, 1000));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract order hash and status from webhook payload
    // Coinzz may send different structures; handle common ones
    const orderHash = body.order_hash || body.data?.order_hash || body.hash || null;
    const coinzzStatus = body.status || body.data?.status || null;
    const trackingCode = body.tracking_code || body.data?.tracking_code || null;
    const deliveryMan = body.delivery_man || body.data?.delivery_man || null;

    if (!orderHash) {
      console.error("[coinzz-webhook] No order_hash in payload");
      return new Response(JSON.stringify({ error: "No order_hash found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find order by coinzz_order_hash
    const { data: order, error: findErr } = await supabase
      .from("orders")
      .select("id, status, user_id")
      .eq("coinzz_order_hash", orderHash)
      .eq("user_id", storeUserId)
      .maybeSingle();

    if (findErr || !order) {
      console.error("[coinzz-webhook] Order not found for hash:", orderHash, findErr?.message);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[coinzz-webhook] Found order:", order.id, "current status:", order.status);

    const newStatus = coinzzStatus ? mapCoinzzStatus(coinzzStatus) : null;

    // Build update payload
    const updatePayload: any = {};
    if (newStatus && newStatus !== order.status) {
      updatePayload.status = newStatus;
    }
    if (trackingCode) {
      updatePayload.tracking_code = trackingCode;
    }
    if (deliveryMan) {
      updatePayload.delivery_man = deliveryMan;
    }

    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_at = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id);

      if (updateErr) {
        console.error("[coinzz-webhook] Update error:", updateErr.message);
      } else {
        console.log("[coinzz-webhook] Order updated:", JSON.stringify(updatePayload));
      }

      // Insert status history
      if (newStatus && newStatus !== order.status) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          from_status: order.status,
          to_status: newStatus,
          source: "coinzz-webhook",
          raw_payload: body,
        });
        console.log("[coinzz-webhook] Status history recorded:", order.status, "→", newStatus);

        // Trigger automation flows
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              userId: order.user_id,
              orderId: order.id,
              newStatus,
              triggerEvent: "order_status_changed",
            }),
          }).catch((e) =>
            console.warn("[coinzz-webhook] trigger-flow error:", e.message)
          );
        } catch (triggerErr: any) {
          console.warn("[coinzz-webhook] Trigger error:", triggerErr.message);
        }
      }
    } else {
      console.log("[coinzz-webhook] No changes to apply");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[coinzz-webhook] Error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
