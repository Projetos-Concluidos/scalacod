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

    console.log(`[trigger-flow] event=${event} orderId=${orderId} status=${newStatus} userId=${userId}`);

    // Find active flows matching this trigger
    let query = supabase
      .from("flows")
      .select("id, name, trigger_event, trigger_status")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("trigger_event", event);

    // Only filter by trigger_status if newStatus is provided
    if (newStatus) {
      query = query.eq("trigger_status", newStatus);
    }

    const { data: flows, error } = await query;

    console.log(`[trigger-flow] Flows found: ${flows?.length || 0}`, flows?.map(f => `${f.name} (${f.trigger_status})`));

    if (error) {
      console.error("[trigger-flow] DB error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!flows || flows.length === 0) {
      console.log(`[trigger-flow] No active flows for event="${event}" status="${newStatus}"`);
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum fluxo ativo para este trigger", flows_triggered: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // P3: Send-once — check flow_executions for duplicate prevention
    const results = [];
    for (const flow of flows) {
      try {
        // Check if this exact flow+order+status was already executed successfully
        if (orderId) {
          const { data: existingExec } = await supabase
            .from("flow_executions")
            .select("id")
            .eq("flow_id", flow.id)
            .eq("order_id", orderId)
            .eq("status", "completed")
            .limit(1)
            .maybeSingle();

          if (existingExec) {
            console.log(`[trigger-flow] Skipping flow "${flow.name}" — already executed for order ${orderId}`);
            results.push({ flow_id: flow.id, flow_name: flow.name, skipped: true, reason: "already_executed" });
            continue;
          }
        }

        console.log(`[trigger-flow] Executing flow: ${flow.name} (${flow.id})`);
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
        console.log(`[trigger-flow] Flow ${flow.name} result:`, JSON.stringify(data));
        results.push({ flow_id: flow.id, flow_name: flow.name, ...data });
      } catch (e) {
        console.error(`[trigger-flow] Flow ${flow.name} error:`, e.message);
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
