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

    const { userId, orderId, newStatus, triggerEvent } = await req.json();

    if (!userId || !orderId) {
      return new Response(JSON.stringify({ error: "userId and orderId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = triggerEvent || "order_status_changed";

    // Find active flows matching this trigger
    const { data: flows } = await supabase
      .from("flows")
      .select("id, name")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("trigger_event", event)
      .eq("trigger_status", newStatus);

    if (!flows || flows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum fluxo ativo para este trigger", flows_triggered: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Execute each matching flow
    const results = [];
    for (const flow of flows) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/execute-flow`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            flowId: flow.id,
            orderId,
            userId,
          }),
        });

        const data = await res.json();
        results.push({ flow_id: flow.id, flow_name: flow.name, ...data });
      } catch (e) {
        results.push({ flow_id: flow.id, flow_name: flow.name, error: e.message });
      }
    }

    console.log(`[trigger-flow] Triggered ${results.length} flows for ${event}:${newStatus}`);

    return new Response(
      JSON.stringify({ success: true, flows_triggered: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[trigger-flow] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
