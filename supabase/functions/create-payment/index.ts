import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Anti-fraud: 5 requests per 5 minutes
  const { limited } = await checkRateLimit(req, {
    action: "create-payment",
    windowSeconds: 300,
    maxAttempts: 5,
  });
  if (limited) return rateLimitResponse(corsHeaders, 300);

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("store");
    const { orderId, method, cardToken, installments = 1, payerEmail, payerDocument, payerName } = await req.json();

    console.log(`[create-payment] method=${method} store=${storeId} order=${orderId}`);

    if (!storeId || !orderId || !method) {
      return new Response(JSON.stringify({ error: "Missing required fields: storeId, orderId, method" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tenant's MP credentials
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("config, is_active")
      .eq("user_id", storeId)
      .eq("type", "mercadopago")
      .maybeSingle();

    console.log(`[create-payment] MP integration found: ${!!integration}, active: ${integration?.is_active}, error: ${intError?.message || "none"}`);

    if (!integration || intError) {
      return new Response(JSON.stringify({
        error: "MercadoPago não configurado para esta loja. Configure em Configurações → MercadoPago.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!integration.is_active) {
      return new Response(JSON.stringify({
        error: "MercadoPago está desativado. Ative em Configurações → MercadoPago.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const mpToken = (integration.config as any)?.access_token;
    console.log(`[create-payment] MP token present: ${!!mpToken}`);

    if (!mpToken) {
      return new Response(JSON.stringify({
        error: "Access Token do MercadoPago não configurado. Vá em Configurações → MercadoPago e insira o Access Token.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!order || orderError) {
      console.error(`[create-payment] Order not found: ${orderId}`, orderError?.message);
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[create-payment] Order: #${order.order_number}, amount: ${order.order_final_price}, client: ${order.client_name}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const notificationUrl = `${supabaseUrl}/functions/v1/mp-payment-webhook?store=${storeId}`;

    // Clean CPF
    const cleanDoc = (payerDocument || order.client_document || "").replace(/\D/g, "");

    const paymentPayload: any = {
      transaction_amount: Number(order.order_final_price),
      description: `Pedido #${order.order_number || orderId.slice(0, 8)}`,
      external_reference: orderId,
      notification_url: notificationUrl,
      payer: {
        email: payerEmail || order.client_email || "comprador@scalacod.com.br",
        first_name: (payerName || order.client_name || "").split(" ")[0] || "Cliente",
        last_name: (payerName || order.client_name || "").split(" ").slice(1).join(" ") || ".",
        identification: {
          type: "CPF",
          number: cleanDoc || "00000000000",
        },
      },
    };

    // ── WALLET (redirect) ──
    if (method === "wallet") {
      console.log("[create-payment] Creating MP preference for wallet redirect");
      const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{
            title: `Pedido #${order.order_number || orderId.slice(0, 8)}`,
            quantity: 1,
            unit_price: Number(order.order_final_price),
            currency_id: "BRL",
          }],
          payer: {
            email: payerEmail || order.client_email || "comprador@scalacod.com.br",
            name: payerName || order.client_name || "",
          },
          external_reference: orderId,
          notification_url: notificationUrl,
          back_urls: {
            success: `${req.headers.get("origin") || "https://ninja-cod-flow.lovable.app"}/c/${storeId}/success`,
            failure: `${req.headers.get("origin") || "https://ninja-cod-flow.lovable.app"}/c/${storeId}`,
            pending: `${req.headers.get("origin") || "https://ninja-cod-flow.lovable.app"}/c/${storeId}`,
          },
          auto_return: "approved",
        }),
      });

      const pref = await prefRes.json();
      console.log(`[create-payment] Wallet preference status: ${prefRes.status}`, pref.error ? pref : "OK");

      if (!prefRes.ok || pref.error) {
        return new Response(JSON.stringify({
          error: pref.message || "Erro ao criar preferência MercadoPago",
          details: pref.cause || pref.error,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase.from("orders").update({
        payment_method: "wallet",
        status: "Aguardando",
      }).eq("id", orderId);

      return new Response(JSON.stringify({
        method: "wallet",
        walletRedirectUrl: pref.init_point,
        preferenceId: pref.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── PIX / CREDIT_CARD / BOLETO ──
    if (method === "pix") {
      paymentPayload.payment_method_id = "pix";
    } else if (method === "credit_card") {
      if (!cardToken) {
        return new Response(JSON.stringify({ error: "Token do cartão é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      paymentPayload.token = cardToken;
      paymentPayload.installments = Number(installments);
      paymentPayload.capture = true;
    } else if (method === "boleto") {
      paymentPayload.payment_method_id = "bolbradesco";
      paymentPayload.date_of_expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    }

    console.log(`[create-payment] Calling MP API. Method: ${method}, Amount: ${paymentPayload.transaction_amount}`);
    console.log(`[create-payment] Payload:`, JSON.stringify({
      ...paymentPayload,
      // Don't log the full token
      token: paymentPayload.token ? "***" : undefined,
    }));

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `order-${orderId}-${method}-${Date.now()}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const payment = await res.json();
    console.log(`[create-payment] MP Response: status=${res.status}, payment_status=${payment.status}, id=${payment.id}`);

    if (!res.ok || payment.error) {
      console.error("[create-payment] MP Error:", JSON.stringify(payment));
      const errorMsg = payment.message
        || payment.cause?.[0]?.description
        || `Erro MercadoPago (${res.status})`;
      return new Response(JSON.stringify({
        error: errorMsg,
        details: payment.cause || payment.error,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response: any = {
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      method,
    };

    if (method === "pix") {
      response.pixQrCode = payment.point_of_interaction?.transaction_data?.qr_code;
      response.pixQrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
      response.pixExpiration = payment.date_of_expiration;
      console.log(`[create-payment] PIX QR generated: qr=${!!response.pixQrCode}, base64=${!!response.pixQrCodeBase64}`);
    } else if (method === "boleto") {
      response.boletoUrl = payment.transaction_details?.external_resource_url;
      response.boletoBarcode = payment.barcode?.content;
      response.boletoExpiration = payment.date_of_expiration;
      console.log(`[create-payment] Boleto generated: url=${!!response.boletoUrl}`);
    }

    // Update order with payment info
    const updateStatus = payment.status === "approved" ? "Aprovado" : "Aguardando";
    await supabase.from("orders").update({
      coinzz_order_hash: payment.id?.toString(),
      payment_method: method,
      status: updateStatus,
    }).eq("id", orderId);

    console.log(`[create-payment] Order updated: status=${updateStatus}, paymentId=${payment.id}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-payment] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao processar pagamento: " + (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
