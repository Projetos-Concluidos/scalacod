import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function interpolateVariables(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] || `{{${key}}}`);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { flowId, orderId, variables, userId: callerUserId, phone: directPhone } = await req.json();

    if (!flowId) {
      return new Response(JSON.stringify({ error: "flowId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[execute-flow] Starting flow=${flowId} order=${orderId}`);

    // Fetch flow
    const { data: flow, error: flowErr } = await supabase
      .from("flows")
      .select("*")
      .eq("id", flowId)
      .eq("is_active", true)
      .single();

    if (flowErr || !flow) {
      console.error("[execute-flow] Flow not found or inactive:", flowId, flowErr?.message);
      return new Response(JSON.stringify({ error: "Fluxo não encontrado ou inativo" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order if provided
    let order: any = null;
    if (orderId) {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).single();
      order = data;
      console.log(`[execute-flow] Order found: ${!!order}, client: ${order?.client_name}`);
    }

    // Resolve product name via offer_id
    let productName = (order?.products as any)?.main?.product_name || "";
    if (!productName && order?.offer_id) {
      const { data: offer } = await supabase
        .from("offers")
        .select("name, products:product_id(name)")
        .eq("id", order.offer_id)
        .single();
      productName = (offer?.products as any)?.name || offer?.name || "";
    }

    // Build full address
    const endereco = [
      order?.client_address,
      order?.client_address_number ? `nº ${order.client_address_number}` : null,
      order?.client_address_comp,
      order?.client_address_district,
      order?.client_address_city,
      order?.client_address_state,
    ].filter(Boolean).join(", ");

    // Fetch store name
    let storeName = "ScalaCOD";
    const { data: store } = await supabase
      .from("stores")
      .select("name")
      .eq("user_id", flow.user_id)
      .limit(1)
      .maybeSingle();
    if (store?.name) storeName = store.name;
    if (!store) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("store_name")
        .eq("id", flow.user_id)
        .single();
      if (profile?.store_name) storeName = profile.store_name;
    }

    // Build variable context
    const valorNumerico = order ? Number(order.order_final_price) : 0;
    const valorFormatado = order
      ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valorNumerico)
      : "";

    const ctx: Record<string, string> = {
      cliente_nome: order?.client_name || "",
      cliente_telefone: order?.client_phone || "",
      pedido_numero: order?.order_number || order?.id?.slice(0, 8) || "",
      produto_nome: productName,
      endereco_completo: endereco,
      data_entrega: order?.delivery_date ? formatDate(order.delivery_date) : (order?.logistics_type === "coinzz" ? "Via Correios (rastreio será enviado)" : "A definir"),
      valor: valorFormatado,
      valor_total: valorFormatado,
      codigo_rastreio: order?.tracking_code || "",
      loja_nome: storeName,
      status_pedido: order?.status || "",
      ...(variables || {}),
    };

    const targetPhone = directPhone || ctx.cliente_telefone || order?.client_phone;
    if (!targetPhone) {
      return new Response(
        JSON.stringify({ error: "Nenhum telefone de destino disponível" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[execute-flow] Target phone: ${targetPhone}, store: ${storeName}`);

    // Create execution log
    const { data: execution } = await supabase
      .from("flow_executions")
      .insert({
        flow_id: flowId,
        order_id: orderId || null,
        user_id: flow.user_id,
        status: "running",
        variables: ctx,
      })
      .select("id")
      .single();

    const executionId = execution?.id;
    const nodes = (flow.nodes as any[]) || [];
    const edges = (flow.edges as any[]) || [];

    console.log(`[execute-flow] Nodes: ${nodes.length}, Edges: ${edges.length}`);

    // Build adjacency for graph traversal (needed for condition branching)
    const adjacency = new Map<string, { target: string; sourceHandle?: string }[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push({ target: edge.target, sourceHandle: edge.sourceHandle });
    }

    // Find start nodes (no incoming edges)
    const hasIncoming = new Set(edges.map((e: any) => e.target));
    const startNodes = nodes.filter((n) => !hasIncoming.has(n.id));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    let nodesExecuted = 0;
    let errorMessage: string | null = null;

    // BFS/DFS traversal with condition branching support
    const visited = new Set<string>();
    const queue: string[] = startNodes.map((n) => n.id);

    try {
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) continue;

        const nodeType = node.type || node.data?.type;
        console.log(`[execute-flow] Executing node type=${nodeType} id=${node.id}`);

        // Handle delay nodes — if > 25s, schedule remaining nodes via message_queue
        if (nodeType === "delay") {
          const unit = node.data?.unit || "minutes";
          const value = node.data?.value || 1;
          const ms = unit === "hours" ? value * 3600000 : unit === "days" ? value * 86400000 : value * 60000;

          if (ms > 25000) {
            // Schedule remaining nodes via message_queue
            console.log(`[execute-flow] Delay ${value} ${unit} (${ms}ms) — scheduling remaining nodes via queue`);
            const processAfter = new Date(Date.now() + ms).toISOString();

            // Get all downstream nodes that haven't been visited
            const remainingNodeIds = getDownstreamNodes(nodeId, adjacency, visited);
            
            // For each downstream text node, queue the message
            for (const rnId of remainingNodeIds) {
              const rn = nodeMap.get(rnId);
              if (!rn) continue;
              const rnType = rn.type || rn.data?.type;
              if (rnType === "text") {
                const message = interpolateVariables(rn.data?.content || "", ctx);
                await supabase.from("message_queue").insert({
                  user_id: flow.user_id,
                  phone: targetPhone,
                  message,
                  order_id: orderId || null,
                  flow_id: flowId,
                  status: "pending",
                  process_after: processAfter,
                });
                console.log(`[execute-flow] Queued delayed message for node ${rnId} at ${processAfter}`);
              }
            }

            // Mark execution as completed (delayed messages are in queue)
            nodesExecuted++;
            break; // Stop processing — remaining nodes are scheduled
          } else {
            // Short delay — wait inline
            console.log(`[execute-flow] Short delay ${value} ${unit} (${ms}ms)`);
            await new Promise((resolve) => setTimeout(resolve, ms));
            nodesExecuted++;
            // Continue to next nodes normally
            const nextEdges = adjacency.get(nodeId) || [];
            for (const edge of nextEdges) queue.push(edge.target);
            continue;
          }
        }

        // Handle condition nodes — branch based on result
        if (nodeType === "condition") {
          const conditionField = node.data?.condition?.field;
          const conditionOp = node.data?.condition?.operator;
          const conditionValue = node.data?.condition?.value;
          const fieldValue = ctx[conditionField] || "";

          let result = false;
          if (conditionOp === "equals") result = fieldValue === conditionValue;
          else if (conditionOp === "contains") result = fieldValue.includes(conditionValue);
          else if (conditionOp === "not_empty") result = fieldValue.length > 0;
          else if (conditionOp === "empty") result = fieldValue.length === 0;
          else if (conditionOp === "not_equals") result = fieldValue !== conditionValue;

          console.log(`[execute-flow] Condition ${conditionField} ${conditionOp} ${conditionValue}: ${result}`);
          nodesExecuted++;

          // Follow only the matching branch
          const nextEdges = adjacency.get(nodeId) || [];
          const targetHandle = result ? "true" : "false";

          for (const edge of nextEdges) {
            // Match by sourceHandle (true/false) or fallback to label-based matching
            if (edge.sourceHandle === targetHandle || edge.sourceHandle === `${targetHandle}-handle`) {
              queue.push(edge.target);
            }
          }

          // If no edges matched by handle, check if there's only one edge (legacy flows)
          if (nextEdges.length === 1 && result) {
            if (!visited.has(nextEdges[0].target)) queue.push(nextEdges[0].target);
          }

          continue;
        }

        // Handle text nodes
        if (nodeType === "text") {
          const message = interpolateVariables(node.data?.content || "", ctx);
          console.log(`[execute-flow] Sending text: "${message.substring(0, 80)}..."`);
          await sendWhatsApp(flow.user_id, targetPhone, message, supabase, { orderId, flowId });
          nodesExecuted++;
        }

        // Handle audio nodes
        if (nodeType === "audio") {
          const text = interpolateVariables(node.data?.text || "", ctx);
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const audioRes = await fetch(`${supabaseUrl}/functions/v1/generate-audio`, {
              method: "POST",
              headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ text, voiceId: node.data?.voiceId, userId: flow.user_id }),
            });
            const audioData = await audioRes.json();
            if (audioData.audioUrl) {
              await sendWhatsAppMedia(flow.user_id, targetPhone, audioData.audioUrl, "audio", supabase);
            }
          } catch (e) {
            console.error("[execute-flow] Audio failed:", e.message);
          }
          nodesExecuted++;
        }

        // Default: follow all edges to next nodes
        if (nodeType !== "condition") {
          const nextEdges = adjacency.get(nodeId) || [];
          for (const edge of nextEdges) queue.push(edge.target);
        }
      }
    } catch (e) {
      errorMessage = e.message;
      console.error(`[execute-flow] Node execution error:`, e.message);
    }

    // Update execution log
    if (executionId) {
      await supabase.from("flow_executions").update({
        status: errorMessage ? "failed" : "completed",
        nodes_executed: nodesExecuted,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      }).eq("id", executionId);
    }

    console.log(`[execute-flow] Completed. Nodes: ${nodesExecuted}, error: ${errorMessage || "none"}`);

    return new Response(
      JSON.stringify({ success: !errorMessage, execution_id: executionId, nodes_executed: nodesExecuted, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[execute-flow] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Get all downstream node IDs from a given node
function getDownstreamNodes(
  startId: string,
  adjacency: Map<string, { target: string; sourceHandle?: string }[]>,
  alreadyVisited: Set<string>
): string[] {
  const result: string[] = [];
  const queue = [...(adjacency.get(startId) || []).map((e) => e.target)];
  const seen = new Set<string>(alreadyVisited);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    const next = adjacency.get(id) || [];
    for (const e of next) queue.push(e.target);
  }

  return result;
}

async function sendWhatsApp(
  userId: string,
  phone: string,
  content: string,
  supabase: any,
  meta?: { orderId?: string; flowId?: string }
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();

  if (!instance) {
    console.log(`[execute-flow] No connected instance, queuing message`);
    await supabase.from("message_queue").insert({
      user_id: userId, phone, message: content,
      order_id: meta?.orderId || null, flow_id: meta?.flowId || null,
      status: "pending", process_after: new Date().toISOString(),
    });
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-message`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone, content, direct: true, userId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `WhatsApp send failed: ${res.status}`);
    }

    const result = await res.json();
    console.log(`[execute-flow] WhatsApp sent OK via ${result.provider}`);
  } catch (e) {
    console.error(`[execute-flow] Send failed, queuing: ${e.message}`);
    await supabase.from("message_queue").insert({
      user_id: userId, phone, message: content,
      order_id: meta?.orderId || null, flow_id: meta?.flowId || null,
      status: "pending", error_message: e.message,
      process_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));
}

async function sendWhatsAppMedia(
  userId: string, phone: string, mediaUrl: string, type: string, supabase: any
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-message`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ phone, content: "", type, mediaUrl, direct: true, userId }),
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));
}
