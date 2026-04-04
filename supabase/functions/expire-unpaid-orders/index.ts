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

    // Find unpaid Coinzz orders older than 24h still in "Aguardando"
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: fetchErr } = await supabase
      .from("orders")
      .select("id, user_id, order_number, client_name, client_phone, status, logistics_type, coinzz_payment_status")
      .eq("status", "Aguardando")
      .eq("logistics_type", "coinzz")
      .lt("created_at", cutoff)
      .limit(100);

    if (fetchErr) {
      console.error("[expire-unpaid-orders] Fetch error:", fetchErr.message);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log("[expire-unpaid-orders] No expired orders found");
      return new Response(
        JSON.stringify({ expired: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[expire-unpaid-orders] Found ${expiredOrders.length} expired orders`);

    let expired = 0;

    for (const order of expiredOrders) {
      try {
        // Skip if payment was already approved
        if (order.coinzz_payment_status === "approved" || order.coinzz_payment_status === "paid") {
          console.log(`[expire-unpaid-orders] Skipping ${order.id} — payment already ${order.coinzz_payment_status}`);
          continue;
        }

        // Update order status to Frustrado
        const { error: updateErr } = await supabase
          .from("orders")
          .update({
            status: "Frustrado",
            status_description: "Cancelado automaticamente — pagamento não confirmado em 24h",
            coinzz_payment_status: "expired",
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
          raw_payload: { reason: "payment_not_confirmed_24h" },
        });

        // Insert notification for the owner
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          title: "⏰ Pedido expirado",
          body: `Pedido #${order.order_number || order.id.slice(0, 8)} — ${order.client_name || ""} cancelado por falta de pagamento (24h)`,
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
        console.log(`[expire-unpaid-orders] Expired order ${order.id} (#${order.order_number})`);
      } catch (e) {
        console.error(`[expire-unpaid-orders] Error processing ${order.id}:`, e.message);
      }
    }

    console.log(`[expire-unpaid-orders] Done. Expired: ${expired}/${expiredOrders.length}`);

    return new Response(
      JSON.stringify({ expired, total_checked: expiredOrders.length }),
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
