import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map Coinzz order_status → ScalaCOD Kanban status
const ORDER_STATUS_MAP: Record<string, string> = {
  "pedido criado": "Aguardando",
  "aguardando pagamento": "Aguardando",
  "aprovado": "Confirmado",
  "cancelado": "Frustrado",
  "expirado": "Frustrado",
  "reclamado": "Frustrado",
  "reembolso em andamento": "Frustrado",
  "reembolsado": "Frustrado",
  "contestado": "Frustrado",
  "chargeback": "Frustrado",
  "aguardando envio": "Em Separação",
  "aguardando chegada": "Em Separação",
  "em análise": "Aguardando",
  "rejeitado": "Frustrado",
  "inadimplente": "Aguardando",
  "processando": "Em Separação",
  "aguardando afiliado": "Aguardando",
  "recusado": "Frustrado",
  "análise de risco": "Aguardando",
  "excluído": "Frustrado",
  "período de teste": "Aguardando",
  "parcial": "Aguardando",
};

// Map Coinzz shipping_status → ScalaCOD Kanban status (takes priority over order_status)
const SHIPPING_STATUS_MAP: Record<string, string> = {
  "a enviar": "Em Separação",
  "enviado": "Em Rota",
  "recebido": "Entregue",
  "devolvido": "Frustrado",
  "sem sucesso": "Reagendar",
  "fundos insuficientes": "Frustrado",
  "cancelado": "Frustrado",
  "aguardando análise": "Em Separação",
  "suspenso": "Frustrado",
  "aguardando retirada na agência": "Em Rota",
  "saldo insuficiente": "Frustrado",
  "a confirmar": "Em Separação",
  "a caminho": "Em Rota",
  "a reagendar": "Reagendar",
  "processando": "Em Separação",
  "erro": "Frustrado",
  "em devolução": "Frustrado",
  "processando nota": "Em Separação",
  "falha na emissão fiscal": "Em Separação",
  "parcialmente enviado": "Em Rota",
  "parcialmente recebido": "Em Rota",
};

function resolveKanbanStatus(orderStatus: string | null, shippingStatus: string | null): string {
  // Shipping status takes priority when available and meaningful
  if (shippingStatus) {
    const mapped = SHIPPING_STATUS_MAP[shippingStatus.toLowerCase()];
    if (mapped) return mapped;
  }
  if (orderStatus) {
    const mapped = ORDER_STATUS_MAP[orderStatus.toLowerCase()];
    if (mapped) return mapped;
  }
  return "Aguardando";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { limited } = await checkRateLimit(req, {
    action: "coinzz-webhook",
    windowSeconds: 60,
    maxAttempts: 200,
  });
  if (limited) return rateLimitResponse(corsHeaders, 60);

  try {
    const url = new URL(req.url);
    const storeUserId = url.searchParams.get("store");

    if (!storeUserId) {
      console.error("[coinzz-webhook] Missing store param");
      return new Response(JSON.stringify({ error: "Missing store param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("[coinzz-webhook] Received:", JSON.stringify(body).substring(0, 2000));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Parse Coinzz dotted-key payload ──
    const clientData = body.client || {};
    const orderData = body.order || {};
    const utmsData = body.utms || {};

    // Extract fields using dotted keys (Coinzz format)
    const orderNumber = orderData["order.order_number"] || null;
    const orderStatus = orderData["order.order_status"] || null;
    const shippingStatus = orderData["order.shipping_status"] || null;
    const trackingCode = orderData["order.tracking_code"]?.trim() || null;
    const courierName = orderData["order.courier_name"] || null;
    const paymentMethod = orderData["order.method_payment"] || null;
    const totalInstallments = parseInt(orderData["order.total_installments"]) || null;
    const orderFinalPrice = parseFloat(orderData["order.order_final_price"]) || null;
    const orderQuantity = parseInt(orderData["order.order_quantity"]) || null;
    const firstOrder = orderData["order.first_order"] === "true" || orderData["order.first_order"] === true;
    const secondOrder = orderData["order.second_order"] === "true" || orderData["order.second_order"] === true;
    const affiliateName = orderData["order.affiliate_name"] || null;
    const affiliateEmail = orderData["order.affiliate_email"] || null;
    const affiliateCommission = parseFloat(orderData["order.affiliate_commission"]) || null;
    const producerCommission = parseFloat(orderData["order.producer_commission"]) || null;

    // UTMs
    const utmSource = utmsData["utms.utm_source"] || null;
    const utmMedium = utmsData["utms.utm_medium"] || null;
    const utmCampaign = utmsData["utms.utm_campaign"] || null;
    const utmContent = utmsData["utms.utm_content"] || null;
    const utmTerm = utmsData["utms.utm_term"] || null;

    if (!orderNumber) {
      console.error("[coinzz-webhook] No order_number in payload");
      return new Response(JSON.stringify({ error: "No order_number found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[coinzz-webhook] order_number:", orderNumber, "order_status:", orderStatus, "shipping_status:", shippingStatus);

    // ── Find order: try coinzz_order_hash first, then order_number ──
    let order: any = null;

    // Try by coinzz_order_hash
    const { data: byHash } = await supabase
      .from("orders")
      .select("id, status, user_id")
      .eq("coinzz_order_hash", orderNumber)
      .eq("user_id", storeUserId)
      .maybeSingle();

    if (byHash) {
      order = byHash;
    } else {
      // Fallback: try by order_number
      const { data: byNumber } = await supabase
        .from("orders")
        .select("id, status, user_id")
        .eq("order_number", orderNumber)
        .eq("user_id", storeUserId)
        .maybeSingle();
      order = byNumber;
    }

    if (!order) {
      console.error("[coinzz-webhook] Order not found for:", orderNumber);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[coinzz-webhook] Found order:", order.id, "current status:", order.status);

    // ── Resolve Kanban status ──
    const newKanbanStatus = resolveKanbanStatus(orderStatus, shippingStatus);

    // ── Build update payload ──
    const updatePayload: Record<string, any> = {};

    if (newKanbanStatus && newKanbanStatus !== order.status) {
      updatePayload.status = newKanbanStatus;
    }
    if (trackingCode) updatePayload.tracking_code = trackingCode;
    if (courierName) updatePayload.delivery_man = courierName;
    if (paymentMethod) updatePayload.payment_method = paymentMethod;
    if (orderStatus) updatePayload.coinzz_payment_status = orderStatus;
    if (shippingStatus) updatePayload.coinzz_shipping_status = shippingStatus;
    if (totalInstallments) updatePayload.total_installments = totalInstallments;
    if (orderFinalPrice) updatePayload.order_final_price = orderFinalPrice;
    if (orderQuantity) updatePayload.order_quantity = orderQuantity;
    if (firstOrder !== undefined) updatePayload.first_order = firstOrder;
    if (secondOrder !== undefined) updatePayload.second_order = secondOrder;
    if (affiliateName) updatePayload.affiliate_name = affiliateName;
    if (affiliateEmail) updatePayload.affiliate_email = affiliateEmail;
    if (affiliateCommission) updatePayload.affiliate_commission = affiliateCommission;

    // UTMs (only if not already set)
    if (utmSource) updatePayload.utm_source = utmSource;
    if (utmMedium) updatePayload.utm_medium = utmMedium;
    if (utmCampaign) updatePayload.utm_campaign = utmCampaign;
    if (utmContent) updatePayload.utm_content = utmContent;
    if (utmTerm) updatePayload.utm_term = utmTerm;

    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_at = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id);

      if (updateErr) {
        console.error("[coinzz-webhook] Update error:", updateErr.message);
      } else {
        console.log("[coinzz-webhook] Order updated:", JSON.stringify(updatePayload));
      }

      // Insert status history when kanban status changed
      if (newKanbanStatus && newKanbanStatus !== order.status) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          from_status: order.status,
          to_status: newKanbanStatus,
          source: "coinzz-webhook",
          raw_payload: body,
        });
        console.log("[coinzz-webhook] Status history:", order.status, "→", newKanbanStatus);

        // Push notification for approved payments
        if (newKanbanStatus === "Confirmado") {
          const valorFormatado = orderFinalPrice
            ? `R$ ${orderFinalPrice.toFixed(2).replace(".", ",")}`
            : "";

          await supabase.from("notifications").insert({
            user_id: order.user_id,
            title: "Pagamento aprovado! 💰",
            body: `Pedido #${orderNumber}${valorFormatado ? ` — ${valorFormatado}` : ""} foi confirmado via Coinzz.`,
            type: "new_order",
            metadata: { order_id: order.id, source: "coinzz" },
          });
          console.log("[coinzz-webhook] Push notification created for approved payment");
        }

        // Trigger automation flows
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              userId: order.user_id,
              orderId: order.id,
              newStatus: newKanbanStatus,
              triggerEvent: "order_status_changed",
            }),
          }).catch((e) =>
            console.warn("[coinzz-webhook] trigger-flow error:", e.message)
          );
        } catch (triggerErr: any) {
          console.warn("[coinzz-webhook] Trigger error:", triggerErr.message);
        }
      }
    } else {
      console.log("[coinzz-webhook] No changes to apply");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[coinzz-webhook] Error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
