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

    // ── Insert notification for delivered/frustrated status ──
    const lowerStatus = (newStatus || "").toLowerCase();
    if (lowerStatus.includes("entregue") || lowerStatus === "delivered") {
      try {
        const { data: ord } = await supabase.from("orders").select("order_number, client_name").eq("id", orderId).maybeSingle();
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "✅ Pedido entregue!",
          body: `Pedido #${ord?.order_number || orderId?.slice(0, 8)} — ${ord?.client_name || ""}`,
          type: "delivered",
        });
        console.log("[trigger-flow] Notification delivered inserted");
      } catch (e: any) { console.warn("[trigger-flow] Notif error:", e.message); }
    } else if (lowerStatus.includes("frustrad") || lowerStatus.includes("cancelad") || lowerStatus.includes("devolvid")) {
      try {
        const { data: ord } = await supabase.from("orders").select("order_number, client_name").eq("id", orderId).maybeSingle();
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "⚠️ Pedido frustrado",
          body: `Pedido #${ord?.order_number || orderId?.slice(0, 8)} — ${ord?.client_name || ""} — Status: ${newStatus}`,
          type: "frustrated",
        });
        console.log("[trigger-flow] Notification frustrated inserted");
      } catch (e: any) { console.warn("[trigger-flow] Notif error:", e.message); }
    }

    // ── Auto-enroll in remarketing campaigns for frustrated orders ──
    if (lowerStatus.includes("frustrad") || lowerStatus.includes("cancelad") || lowerStatus.includes("devolvid")) {
      try {
        const triggerStatusMap: Record<string, string> = {};
        if (lowerStatus.includes("frustrad")) triggerStatusMap["Frustrado"] = "Frustrado";
        if (lowerStatus.includes("cancelad")) triggerStatusMap["Cancelado"] = "Cancelado";
        if (lowerStatus.includes("devolvid")) triggerStatusMap["Devolvido"] = "Devolvido";

        const { data: activeCampaigns } = await supabase
          .from("remarketing_campaigns")
          .select("id, trigger_status, flow_type")
          .eq("is_active", true)
          .eq("user_id", userId);

        if (activeCampaigns && activeCampaigns.length > 0) {
          // Get order logistics_type for matching
          const { data: orderData } = await supabase.from("orders").select("logistics_type").eq("id", orderId).single();
          const orderFlowType = orderData?.logistics_type === "coinzz" ? "coinzz" : orderData?.logistics_type === "hyppe" ? "hyppe" : "cod";

          for (const camp of activeCampaigns) {
            // Check trigger status matches
            if (!triggerStatusMap[camp.trigger_status]) continue;
            // Check flow_type matches
            if (camp.flow_type !== "all" && camp.flow_type !== orderFlowType) continue;

            const { error: enrollError } = await supabase
              .from("remarketing_enrollments")
              .upsert({
                campaign_id: camp.id,
                order_id: orderId,
                user_id: userId,
                status: "active",
                current_step: 0,
                enrolled_at: new Date().toISOString(),
              }, { onConflict: "campaign_id,order_id" });

            if (enrollError) {
              console.warn(`[trigger-flow] Remarketing enrollment error for campaign ${camp.id}:`, enrollError.message);
            } else {
              // Increment total_enrolled
              await supabase.rpc("increment_remarketing_enrolled" as any, { p_campaign_id: camp.id }).catch(() => {
                // Fallback: manual increment
                supabase.from("remarketing_campaigns")
                  .update({ total_enrolled: (camp as any).total_enrolled + 1 })
                  .eq("id", camp.id).then(() => {});
              });
              console.log(`[trigger-flow] Enrolled order ${orderId} in remarketing campaign ${camp.id}`);
            }
          }
        }
      } catch (e: any) { console.warn("[trigger-flow] Remarketing enrollment error:", e.message); }
    }

    // Determine flow_type based on order's logistics_type
    let flowType: string | null = null;
    if (orderId) {
      const { data: order } = await supabase
        .from("orders")
        .select("logistics_type")
        .eq("id", orderId)
        .single();
      if (order) {
        flowType = order.logistics_type === "coinzz" ? "coinzz" : "cod";
      }
    }

    console.log(`[trigger-flow] Resolved flow_type=${flowType}`);

    // Find active flows matching this trigger
    let query = supabase
      .from("flows")
      .select("id, name, trigger_event, trigger_status, flow_type")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("trigger_event", event);

    // Only filter by trigger_status if newStatus is provided
    if (newStatus) {
      query = query.eq("trigger_status", newStatus);
    }

    // Filter by flow_type to avoid cross-triggering COD/Coinzz
    if (flowType) {
      query = query.eq("flow_type", flowType);
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
        if (orderId) {
          // Guard 1: Time-based cooldown — skip if same flow+order executed in last 10 minutes
          const cooldownTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          const { data: recentExec } = await supabase
            .from("flow_executions")
            .select("id")
            .eq("flow_id", flow.id)
            .eq("order_id", orderId)
            .gte("created_at", cooldownTime)
            .limit(1)
            .maybeSingle();

          if (recentExec) {
            console.log(`[trigger-flow] Skipping flow "${flow.name}" — executed within last 10min for order ${orderId}`);
            results.push({ flow_id: flow.id, flow_name: flow.name, skipped: true, reason: "cooldown_10min" });
            continue;
          }

          // Guard 2: Dedup — skip if already completed AND no intermediate status transition
          const { data: existingExec } = await supabase
            .from("flow_executions")
            .select("id, completed_at")
            .eq("flow_id", flow.id)
            .eq("order_id", orderId)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingExec) {
            const lastExecTime = existingExec.completed_at || new Date(0).toISOString();
            const { data: intermediateTransition } = await supabase
              .from("order_status_history")
              .select("id")
              .eq("order_id", orderId)
              .eq("from_status", newStatus)
              .gt("created_at", lastExecTime)
              .limit(1)
              .maybeSingle();

            if (!intermediateTransition) {
              console.log(`[trigger-flow] Skipping flow "${flow.name}" — already executed for order ${orderId}, no intermediate transition`);
              results.push({ flow_id: flow.id, flow_name: flow.name, skipped: true, reason: "already_executed" });
              continue;
            }
            console.log(`[trigger-flow] Re-executing flow "${flow.name}" — order had intermediate status change after last execution`);
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
