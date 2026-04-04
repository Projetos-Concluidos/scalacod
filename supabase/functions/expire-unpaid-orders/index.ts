import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch Coinzz unpaid orders
    const { data: coinzzOrders, error: coinzzErr } = await supabase
      .from("orders")
      .select("id, user_id, order_number, client_name, client_phone, status, logistics_type, coinzz_payment_status")
      .eq("status", "Aguardando")
      .eq("logistics_type", "coinzz")
      .lt("created_at", cutoff)
      .limit(100);

    // Fetch Logzz unpaid orders (COD orders stuck in Aguardando for 24h+)
    const { data: logzzOrders, error: logzzErr } = await supabase
      .from("orders")
      .select("id, user_id, order_number, client_name, client_phone, status, logistics_type, coinzz_payment_status, logzz_order_id")
      .eq("status", "Aguardando")
      .eq("logistics_type", "logzz")
      .is("logzz_order_id", null) // Not yet synced to Logzz = not confirmed
      .lt("created_at", cutoff)
      .limit(100);

    if (coinzzErr) {
      console.error("[expire-unpaid-orders] Coinzz fetch error:", coinzzErr.message);
    }
    if (logzzErr) {
      console.error("[expire-unpaid-orders] Logzz fetch error:", logzzErr.message);
    }

    const allOrders = [
      ...(coinzzOrders || []),
      ...(logzzOrders || []),
    ];

    if (allOrders.length === 0) {
      console.log("[expire-unpaid-orders] No expired orders found");
      return new Response(
        JSON.stringify({ expired: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[expire-unpaid-orders] Found ${allOrders.length} expired orders (coinzz: ${coinzzOrders?.length || 0}, logzz: ${logzzOrders?.length || 0})`);

    let expired = 0;

    for (const order of allOrders) {
      try {
        // Skip Coinzz orders where payment was already approved
        if (order.logistics_type === "coinzz" &&
          (order.coinzz_payment_status === "approved" || order.coinzz_payment_status === "paid")) {
          console.log(`[expire-unpaid-orders] Skipping ${order.id} — payment already ${order.coinzz_payment_status}`);
          continue;
        }

        const reason = order.logistics_type === "coinzz"
          ? "Cancelado automaticamente — pagamento não confirmado em 24h"
          : "Cancelado automaticamente — pedido não sincronizado com Logzz em 24h";

        // Update order status to Frustrado
        const { error: updateErr } = await supabase
          .from("orders")
          .update({
            status: "Frustrado",
            status_description: reason,
            ...(order.logistics_type === "coinzz" ? { coinzz_payment_status: "expired" } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (updateErr) {
          console.error(`[expire-unpaid-orders] Update error for ${order.id}:`, updateErr.message);
          continue;
        }

        // Record status history
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          from_status: order.status,
          to_status: "Frustrado",
          source: "expire-unpaid-orders",
          raw_payload: { reason: order.logistics_type === "coinzz" ? "payment_not_confirmed_24h" : "logzz_not_synced_24h", logistics_type: order.logistics_type },
        });

        // Insert notification for the owner
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          title: "⏰ Pedido expirado",
          body: `Pedido #${order.order_number || order.id.slice(0, 8)} — ${order.client_name || ""} cancelado por falta de ${order.logistics_type === "coinzz" ? "pagamento" : "sincronização"} (24h)`,
          type: "frustrated",
        });

        // Trigger flows for status change
        try {
          await fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: order.user_id,
              orderId: order.id,
              newStatus: "Frustrado",
              triggerEvent: "order_status_changed",
            }),
          });
        } catch (e) {
          console.warn(`[expire-unpaid-orders] Trigger-flow error for ${order.id}:`, e.message);
        }

        expired++;
        console.log(`[expire-unpaid-orders] Expired ${order.logistics_type} order ${order.id} (#${order.order_number})`);
      } catch (e) {
        console.error(`[expire-unpaid-orders] Error processing ${order.id}:`, e.message);
      }
    }

    console.log(`[expire-unpaid-orders] Done. Expired: ${expired}/${allOrders.length}`);

    return new Response(
      JSON.stringify({ expired, total_checked: allOrders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[expire-unpaid-orders] Fatal error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
