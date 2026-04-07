import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Hyppe status to ScalaCOD Kanban status
const STATUS_MAP: Record<string, string> = {
  "AGENDADO": "Agendado",
  "PENDENTE": "Aguardando",
  "EM_SEPARACAO": "Em Separação",
  "EM SEPARAÇÃO": "Em Separação",
  "SEPARADO": "Separado",
  "EM_ROTA": "Em Rota",
  "EM ROTA": "Em Rota",
  "ROTEIRIZADO": "Em Rota",
  "ENTREGUE": "Entregue",
  "CANCELADO": "Frustrado",
  "FRUSTRADO": "Frustrado",
  "DEVOLVIDO": "Frustrado",
  "REAGENDAR": "Reagendar",
  "CONFIRMADO": "Confirmado",
  "APROVADO": "Aprovado",
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
    console.log("[hyppe-webhook] Received:", JSON.stringify(body).substring(0, 1000));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Extract order ID and status from webhook payload
    // Hyppe webhook format may vary - handle multiple structures
    const hyppeOrderId = body?.pedido_id || body?.id || body?.pedido?.id || body?.data?.id || null;
    const rawStatus = body?.status || body?.pedido?.status || body?.data?.status || null;
    const statusPagamento = body?.status_pagamento || body?.pedido?.status_pagamento || null;

    if (!hyppeOrderId) {
      console.warn("[hyppe-webhook] No order ID found in payload");
      return new Response(JSON.stringify({ ok: true, message: "No order ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find order by hyppe_order_id
    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("user_id", storeUserId)
      .eq("hyppe_order_id", String(hyppeOrderId))
      .maybeSingle();

    if (!order) {
      console.warn("[hyppe-webhook] Order not found for hyppe_order_id:", hyppeOrderId);
      return new Response(JSON.stringify({ ok: true, message: "Order not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map status
    const newStatus = STATUS_MAP[(rawStatus || "").toUpperCase()] || null;
    const prevStatus = order.status;

    if (newStatus && newStatus !== prevStatus) {
      console.log("[hyppe-webhook] Updating order:", order.id, "from:", prevStatus, "to:", newStatus);

      await admin.from("orders").update({
        status: newStatus,
        status_description: `Hyppe: ${rawStatus}${statusPagamento ? ` (pgto: ${statusPagamento})` : ""}`,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);

      await admin.from("order_status_history").insert({
        order_id: order.id,
        from_status: prevStatus,
        to_status: newStatus,
        source: "hyppe_webhook",
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
        console.warn("[hyppe-webhook] trigger-flow error:", e.message);
      }
    } else {
      console.log("[hyppe-webhook] No status change for order:", order.id, "raw:", rawStatus);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[hyppe-webhook] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
