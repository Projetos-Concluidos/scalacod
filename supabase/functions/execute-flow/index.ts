import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function interpolateVariables(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] || `{{${key}}}`);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR");
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
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      order = data;
      console.log(`[execute-flow] Order found: ${!!order}, client: ${order?.client_name}, phone: ${order?.client_phone}`);
    }

    // Resolve product name via offer_id → products table
    let productName = (order?.products as any)?.main?.product_name || "";
    if (!productName && order?.offer_id) {
      const { data: offer } = await supabase
        .from("offers")
        .select("name, products:product_id(name)")
        .eq("id", order.offer_id)
        .single();
      productName = (offer?.products as any)?.name || offer?.name || "";
      console.log(`[execute-flow] Product name resolved via offer: "${productName}"`);
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

    // Also check profile store_name
    if (!store) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("store_name")
        .eq("id", flow.user_id)
        .single();
      if (profile?.store_name) storeName = profile.store_name;
    }

    // Build variable context
    // Format currency — strip "R$" prefix so templates can use "R$ {{valor}}" without duplication
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
      console.warn("[execute-flow] No target phone available");
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

    console.log(`[execute-flow] Nodes: ${nodes.length}, Edges: ${edges.length}, ExecutionId: ${executionId}`);

    // Sort nodes by execution order using edges (topological)
    const sortedNodes = topologicalSort(nodes, edges);

    let nodesExecuted = 0;
    let errorMessage: string | null = null;

    try {
      for (const node of sortedNodes) {
        console.log(`[execute-flow] Executing node type=${node.type || node.data?.type} id=${node.id}`);
        await executeNode(node, ctx, targetPhone, flow.user_id, supabase, { orderId, flowId });
        nodesExecuted++;
      }
    } catch (e) {
      errorMessage = e.message;
      console.error(`[execute-flow] Node execution error:`, e.message);
    }

    // Update execution log
    if (executionId) {
      await supabase
        .from("flow_executions")
        .update({
          status: errorMessage ? "failed" : "completed",
          nodes_executed: nodesExecuted,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionId);
    }

    console.log(`[execute-flow] Completed. Nodes executed: ${nodesExecuted}, error: ${errorMessage || "none"}`);

    return new Response(
      JSON.stringify({
        success: !errorMessage,
        execution_id: executionId,
        nodes_executed: nodesExecuted,
        error: errorMessage,
      }),
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

function topologicalSort(nodes: any[], edges: any[]): any[] {
  if (!edges || edges.length === 0) return nodes;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: any[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const next of adjacency.get(id) || []) {
      inDegree.set(next, (inDegree.get(next) || 0) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // Add any orphan nodes not in edges
  for (const node of nodes) {
    if (!sorted.find((n) => n.id === node.id)) sorted.push(node);
  }

  return sorted;
}

async function executeNode(
  node: any,
  ctx: Record<string, string>,
  phone: string,
  userId: string,
  supabase: any,
  meta?: { orderId?: string; flowId?: string }
) {
  const nodeType = node.type || node.data?.type;

  switch (nodeType) {
    case "text": {
      const message = interpolateVariables(node.data?.content || "", ctx);
      console.log(`[execute-flow] Sending text to ${phone}: "${message.substring(0, 80)}..."`);
      await sendWhatsApp(userId, phone, message, supabase, meta);
      break;
    }

    case "delay": {
      const unit = node.data?.unit || "minutes";
      const value = node.data?.value || 1;
      const ms = unit === "hours" ? value * 3600000 : unit === "days" ? value * 86400000 : value * 60000;
      // Simple delay (max ~25s in edge functions, so cap it)
      const cappedMs = Math.min(ms, 25000);
      if (cappedMs > 0) {
        console.log(`[execute-flow] Delay ${value} ${unit} (capped to ${cappedMs}ms)`);
        await new Promise((resolve) => setTimeout(resolve, cappedMs));
      }
      if (ms > 25000) {
        console.warn(`[execute-flow] Delay of ${value} ${unit} exceeds edge function timeout. Only waited ${cappedMs}ms.`);
      }
      break;
    }

    case "condition": {
      const conditionField = node.data?.condition?.field;
      const conditionOp = node.data?.condition?.operator;
      const conditionValue = node.data?.condition?.value;
      const fieldValue = ctx[conditionField] || "";

      let result = false;
      if (conditionOp === "equals") result = fieldValue === conditionValue;
      else if (conditionOp === "contains") result = fieldValue.includes(conditionValue);
      else if (conditionOp === "not_empty") result = fieldValue.length > 0;
      else if (conditionOp === "empty") result = fieldValue.length === 0;

      console.log(`[execute-flow] Condition ${conditionField} ${conditionOp} ${conditionValue}: ${result}`);
      break;
    }

    case "audio": {
      const text = interpolateVariables(node.data?.text || "", ctx);
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const audioRes = await fetch(`${supabaseUrl}/functions/v1/generate-audio`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            voiceId: node.data?.voiceId,
            userId,
          }),
        });

        const audioData = await audioRes.json();
        if (audioData.audioUrl) {
          await sendWhatsAppMedia(userId, phone, audioData.audioUrl, "audio", supabase);
        } else {
          console.warn("[execute-flow] Audio generation returned no URL");
        }
      } catch (e) {
        console.error("[execute-flow] Audio generation failed:", e.message);
      }
      break;
    }

    default:
      console.log(`[execute-flow] Unknown node type: ${nodeType}, skipping`);
  }
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

  // Check if user has a connected instance before attempting send
  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();

  if (!instance) {
    // No connected instance — queue the message for retry
    console.log(`[execute-flow] No connected instance for user=${userId}, queuing message`);
    await supabase.from("message_queue").insert({
      user_id: userId,
      phone,
      message: content,
      order_id: meta?.orderId || null,
      flow_id: meta?.flowId || null,
      status: "pending",
      process_after: new Date().toISOString(),
    });
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        content,
        direct: true,
        userId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `WhatsApp send failed: ${res.status}`);
    }

    const result = await res.json();
    console.log(`[execute-flow] WhatsApp sent OK via ${result.provider}, msgId: ${result.message_id}`);
  } catch (e) {
    // Send failed — queue for retry
    console.error(`[execute-flow] Send failed, queuing: ${e.message}`);
    await supabase.from("message_queue").insert({
      user_id: userId,
      phone,
      message: content,
      order_id: meta?.orderId || null,
      flow_id: meta?.flowId || null,
      status: "pending",
      error_message: e.message,
      process_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  }

  // Small delay between messages to avoid rate limiting
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

async function sendWhatsAppMedia(
  userId: string,
  phone: string,
  mediaUrl: string,
  type: string,
  supabase: any
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      content: "",
      type,
      mediaUrl,
      direct: true,
      userId, // Pass userId for service-to-service auth
    }),
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));
}
