import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BROWSER_HEADERS: Record<string, string> = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Origin": "https://app.logzz.com.br",
  "Referer": "https://app.logzz.com.br/",
  "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

const STATUS_MAP: Record<string, string> = {
  "AGENDADO": "Agendado",
  "PENDENTE": "Aguardando",
  "CONFIRMADO": "Confirmado",
  "APROVADO": "Aprovado",
  "EM_SEPARACAO": "Em Separação",
  "EM SEPARAÇÃO": "Em Separação",
  "EM SEPARACAO": "Em Separação",
  "SEPARADO": "Separado",
  "EM_ROTA": "Em Rota",
  "EM ROTA": "Em Rota",
  "ROTEIRIZADO": "Em Rota",
  "SAIU_PARA_ENTREGA": "Em Rota",
  "ENTREGUE": "Entregue",
  "CANCELADO": "Frustrado",
  "FRUSTRADO": "Frustrado",
  "DEVOLVIDO": "Frustrado",
  "REAGENDAR": "Reagendar",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Token JWT ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Logzz bearer token
    const { data: integrations } = await admin
      .from("integrations")
      .select("config")
      .eq("user_id", user.id)
      .eq("type", "logzz")
      .limit(1);

    const logzzToken = (integrations?.[0]?.config as any)?.bearer_token;
    if (!logzzToken) {
      return new Response(JSON.stringify({ success: false, error: "Integração Logzz não configurada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active Logzz orders (not in terminal states)
    const terminalStatuses = ["Entregue", "Frustrado", "Devolvido"];
    const { data: orders } = await admin
      .from("orders")
      .select("id, order_number, logzz_order_id, status")
      .eq("user_id", user.id)
      .eq("logistics_type", "logzz")
      .not("logzz_order_id", "is", null)
      .not("status", "in", `(${terminalStatuses.map(s => `"${s}"`).join(",")})`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ success: true, synced: 0, message: "Nenhum pedido ativo para sincronizar" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[logzz-sync-status] Syncing ${orders.length} orders for user ${user.id}`);

    let synced = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        // Query Logzz API for order status
        const logzzUrl = `https://app.logzz.com.br/api/v1/orders/${order.logzz_order_id}`;
        const res = await fetch(logzzUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${logzzToken}`,
            Accept: "application/json",
          },
          redirect: "manual",
        });

        if (res.status !== 200) {
          // Try alternative endpoint
          const altUrl = `https://app.logzz.com.br/api/v1/pedidos/${order.logzz_order_id}`;
          const altRes = await fetch(altUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${logzzToken}`,
              Accept: "application/json",
            },
            redirect: "manual",
          });

          if (altRes.status !== 200) {
            console.warn(`[logzz-sync-status] Could not fetch order ${order.logzz_order_id}: status ${res.status}/${altRes.status}`);
            errors.push(`${order.logzz_order_id}: API ${res.status}`);
            continue;
          }

          const contentType = altRes.headers.get("content-type") || "";
          if (!contentType.includes("json")) {
            errors.push(`${order.logzz_order_id}: resposta não-JSON`);
            continue;
          }

          const altBody = await altRes.json();
          await processLogzzResponse(admin, supabaseUrl, serviceKey, order, altBody, user.id);
          synced++;
          continue;
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
          errors.push(`${order.logzz_order_id}: resposta não-JSON`);
          continue;
        }

        const body = await res.json();
        await processLogzzResponse(admin, supabaseUrl, serviceKey, order, body, user.id);
        synced++;
      } catch (e: any) {
        console.warn(`[logzz-sync-status] Error syncing ${order.logzz_order_id}:`, e.message);
        errors.push(`${order.logzz_order_id}: ${e.message}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[logzz-sync-status] Done: ${synced} synced, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      synced,
      total: orders.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[logzz-sync-status] Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processLogzzResponse(
  admin: any,
  supabaseUrl: string,
  serviceKey: string,
  order: { id: string; status: string; logzz_order_id: string | null; order_number: string | null },
  body: any,
  userId: string,
) {
  // Extract status from multiple possible response shapes
  const rawStatus =
    body?.status || body?.pedido?.status || body?.data?.status ||
    body?.order?.status || null;

  if (!rawStatus) {
    console.log(`[logzz-sync-status] No status in response for ${order.logzz_order_id}`);
    return;
  }

  const newStatus = STATUS_MAP[rawStatus.toUpperCase().trim()] || STATUS_MAP[rawStatus.toUpperCase().replace(/\s+/g, "_")] || null;

  if (!newStatus || newStatus === order.status) {
    return; // same status, skip
  }

  console.log(`[logzz-sync-status] Order ${order.logzz_order_id}: ${order.status} → ${newStatus}`);

  // Extract extra fields
  const trackingCode = body?.tracking_code || body?.codigo_rastreio || body?.pedido?.tracking_code || body?.data?.tracking_code || null;
  const deliveryMan = body?.delivery_man || body?.entregador || body?.pedido?.delivery_man || null;
  const logisticOperator = body?.logistic_operator || body?.operador_logistico || body?.pedido?.logistic_operator || null;
  const labelA4 = body?.label_a4_url || body?.etiqueta_a4 || body?.pedido?.label_a4_url || null;
  const labelThermal = body?.label_thermal_url || body?.etiqueta_termica || body?.pedido?.label_thermal_url || null;
  const statusDescription = body?.status_description || body?.motivo || body?.pedido?.status_description || body?.reason || null;

  const updatePayload: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (statusDescription) updatePayload.status_description = `Logzz: ${statusDescription}`;
  else updatePayload.status_description = `Logzz sync: ${rawStatus}`;
  if (trackingCode) updatePayload.tracking_code = trackingCode;
  if (deliveryMan) updatePayload.delivery_man = deliveryMan;
  if (logisticOperator) updatePayload.logistic_operator = logisticOperator;
  if (labelA4) updatePayload.label_a4_url = labelA4;
  if (labelThermal) updatePayload.label_thermal_url = labelThermal;

  await admin.from("orders").update(updatePayload).eq("id", order.id);

  // Record status history
  await admin.from("order_status_history").insert({
    order_id: order.id,
    from_status: order.status,
    to_status: newStatus,
    source: "logzz_sync",
    raw_payload: { logzz_response: body, sync_type: "automatic" },
  });

  // Trigger automation flow
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        orderId: order.id,
        newStatus,
        triggerEvent: "order_status_changed",
      }),
    });
  } catch (e: any) {
    console.warn("[logzz-sync-status] trigger-flow error:", e.message);
  }
}
