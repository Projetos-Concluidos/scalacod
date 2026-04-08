import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const url = new URL(req.url);
    const storeUserId = url.searchParams.get("store");

    if (!storeUserId) {
      return new Response(JSON.stringify({ error: "store param required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("[logzz-webhook] Received:", JSON.stringify(body).substring(0, 1500));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Extract fields from Logzz webhook payload (multiple formats)
    const externalId = body?.external_id || body?.pedido?.external_id || body?.data?.external_id || null;
    const logzzOrderId = body?.order_id || body?.pedido_id || body?.id || body?.pedido?.id || body?.data?.id || null;
    const orderNumber = body?.order_number || body?.pedido?.order_number || body?.numero_pedido || null;
    const rawStatus = body?.status || body?.pedido?.status || body?.data?.status || null;
    const trackingCode = body?.tracking_code || body?.codigo_rastreio || body?.pedido?.tracking_code || null;
    const deliveryMan = body?.delivery_man || body?.entregador || body?.pedido?.delivery_man || null;
    const logisticOperator = body?.logistic_operator || body?.operador_logistico || body?.pedido?.logistic_operator || null;
    const labelA4 = body?.label_a4_url || body?.etiqueta_a4 || body?.pedido?.label_a4_url || null;
    const labelThermal = body?.label_thermal_url || body?.etiqueta_termica || body?.pedido?.label_thermal_url || null;

    // Find order: try external_id → logzz_order_id → order_number
    let order = null;

    if (externalId) {
      const { data } = await admin
        .from("orders")
        .select("*")
        .eq("user_id", storeUserId)
        .eq("id", externalId)
        .maybeSingle();
      order = data;
    }

    if (!order && logzzOrderId) {
      const { data } = await admin
        .from("orders")
        .select("*")
        .eq("user_id", storeUserId)
        .eq("logzz_order_id", String(logzzOrderId))
        .maybeSingle();
      order = data;
    }

    if (!order && orderNumber) {
      const { data } = await admin
        .from("orders")
        .select("*")
        .eq("user_id", storeUserId)
        .eq("order_number", String(orderNumber))
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.warn("[logzz-webhook] Order not found. external_id:", externalId, "logzz_order_id:", logzzOrderId, "order_number:", orderNumber);
      return new Response(JSON.stringify({ ok: true, message: "Order not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check idempotency - skip if same status transition in last 5 minutes
    const { data: recentHistory } = await admin
      .from("order_status_history")
      .select("id")
      .eq("order_id", order.id)
      .eq("to_status", STATUS_MAP[(rawStatus || "").toUpperCase()] || rawStatus || "")
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1);

    if (recentHistory && recentHistory.length > 0) {
      console.log("[logzz-webhook] Duplicate event skipped for order:", order.id);
      return new Response(JSON.stringify({ ok: true, message: "Duplicate skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = STATUS_MAP[(rawStatus || "").toUpperCase()] || null;
    const prevStatus = order.status;

    // Build update payload with extra fields
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (newStatus && newStatus !== prevStatus) {
      updatePayload.status = newStatus;
      updatePayload.status_description = `Logzz: ${rawStatus}`;
    }

    if (trackingCode) updatePayload.tracking_code = trackingCode;
    if (deliveryMan) updatePayload.delivery_man = deliveryMan;
    if (logisticOperator) updatePayload.logistic_operator = logisticOperator;
    if (labelA4) updatePayload.label_a4_url = labelA4;
    if (labelThermal) updatePayload.label_thermal_url = labelThermal;

    // Only update if there's something to change
    if (Object.keys(updatePayload).length > 1) {
      console.log("[logzz-webhook] Updating order:", order.id, "payload:", JSON.stringify(updatePayload));

      await admin.from("orders").update(updatePayload).eq("id", order.id);

      // Record status history
      if (newStatus && newStatus !== prevStatus) {
        await admin.from("order_status_history").insert({
          order_id: order.id,
          from_status: prevStatus,
          to_status: newStatus,
          source: "logzz_webhook",
          raw_payload: body,
        });

        // Trigger automation flow
        try {
          await fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
            method: "POST",
            headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: storeUserId,
              orderId: order.id,
              newStatus,
              triggerEvent: "order_status_changed",
            }),
          });
        } catch (e: any) {
          console.warn("[logzz-webhook] trigger-flow error:", e.message);
        }
      }
    } else {
      console.log("[logzz-webhook] No changes for order:", order.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[logzz-webhook] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
