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

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    console.log(`[delivery-reminders] Running for today=${today}, tomorrow=${tomorrow}`);

    // Find orders with delivery_date = tomorrow (D-1 reminder)
    const { data: tomorrowOrders } = await supabase
      .from("orders")
      .select("id, user_id, client_name, client_phone, delivery_date, order_final_price, status")
      .eq("delivery_date", tomorrow)
      .eq("logistics_type", "logzz")
      .in("status", ["Agendado", "Confirmado", "Em Separação", "Separado"]);

    // Find orders with delivery_date = today (Day-D reminder)
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("id, user_id, client_name, client_phone, delivery_date, order_final_price, status")
      .eq("delivery_date", today)
      .eq("logistics_type", "logzz")
      .in("status", ["Agendado", "Confirmado", "Em Separação", "Separado", "Em Rota"]);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const results: any[] = [];

    // D-1 reminders
    for (const order of tomorrowOrders || []) {
      try {
        // Check if D-1 reminder already sent (using flow_executions or message_queue)
        const { data: alreadySent } = await supabase
          .from("message_queue")
          .select("id")
          .eq("order_id", order.id)
          .ilike("message", "%AMANHÃ%")
          .eq("status", "sent")
          .limit(1)
          .maybeSingle();

        if (alreadySent) {
          console.log(`[delivery-reminders] D-1 already sent for order ${order.id}`);
          continue;
        }

        const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.order_final_price));
        const message = `🔔 Lembrete: seu pedido chega AMANHÃ!\n\nData: ${order.delivery_date}\nTenha ${valor} em mãos para o entregador.\nDinheiro, PIX, débito ou crédito até 12x. 💳`;

        await supabase.from("message_queue").insert({
          user_id: order.user_id,
          phone: order.client_phone,
          message,
          order_id: order.id,
          status: "pending",
          process_after: new Date().toISOString(),
        });

        results.push({ order_id: order.id, type: "d-1", status: "queued" });
        console.log(`[delivery-reminders] D-1 queued for order ${order.id}`);
      } catch (e: any) {
        console.error(`[delivery-reminders] D-1 error for ${order.id}:`, e.message);
        results.push({ order_id: order.id, type: "d-1", error: e.message });
      }
    }

    // Day-D reminders
    for (const order of todayOrders || []) {
      try {
        const { data: alreadySent } = await supabase
          .from("message_queue")
          .select("id")
          .eq("order_id", order.id)
          .ilike("message", "%ESTÁ A CAMINHO%")
          .eq("status", "sent")
          .limit(1)
          .maybeSingle();

        if (alreadySent) {
          console.log(`[delivery-reminders] Day-D already sent for order ${order.id}`);
          continue;
        }

        const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.order_final_price));
        const message = `🚚 SEU PEDIDO ESTÁ A CAMINHO!\n\nHoje é o dia da entrega, ${order.client_name}!\nFique em casa e tenha ${valor} pronto. 😊`;

        await supabase.from("message_queue").insert({
          user_id: order.user_id,
          phone: order.client_phone,
          message,
          order_id: order.id,
          status: "pending",
          process_after: new Date().toISOString(),
        });

        results.push({ order_id: order.id, type: "day-d", status: "queued" });
        console.log(`[delivery-reminders] Day-D queued for order ${order.id}`);
      } catch (e: any) {
        console.error(`[delivery-reminders] Day-D error for ${order.id}:`, e.message);
        results.push({ order_id: order.id, type: "day-d", error: e.message });
      }
    }

    console.log(`[delivery-reminders] Done. D-1: ${tomorrowOrders?.length || 0}, Day-D: ${todayOrders?.length || 0}, processed: ${results.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        today,
        tomorrow,
        d1_orders: tomorrowOrders?.length || 0,
        day_d_orders: todayOrders?.length || 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[delivery-reminders] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
