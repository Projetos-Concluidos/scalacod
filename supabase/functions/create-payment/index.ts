import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("store");
    const { orderId, method, cardToken, installments = 1, payerEmail, payerDocument, payerName } = await req.json();

    if (!storeId || !orderId || !method) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tenant's MP credentials
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("config")
      .eq("user_id", storeId)
      .eq("type", "mercadopago")
      .eq("is_active", true)
      .maybeSingle();

    if (!integration || intError) {
      return new Response(JSON.stringify({ error: "MercadoPago não configurado para esta loja" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const mpToken = (integration.config as any)?.access_token;
    if (!mpToken) {
      return new Response(JSON.stringify({ error: "Access Token MP não encontrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!order || orderError) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const notificationUrl = `${supabaseUrl}/functions/v1/mp-payment-webhook?store=${storeId}`;

    const paymentPayload: any = {
      transaction_amount: Number(order.order_final_price),
      description: `Pedido #${order.order_number || orderId}`,
      external_reference: orderId,
      notification_url: notificationUrl,
      payer: {
        email: payerEmail || order.client_email || "comprador@email.com",
        first_name: (payerName || order.client_name || "").split(" ")[0],
        last_name: (payerName || order.client_name || "").split(" ").slice(1).join(" ") || ".",
        identification: {
          type: "CPF",
          number: (payerDocument || order.client_document || "").replace(/\D/g, ""),
        },
      },
    };

    if (method === "pix") {
      paymentPayload.payment_method_id = "pix";
    } else if (method === "credit_card") {
      if (!cardToken) {
        return new Response(JSON.stringify({ error: "Token do cartão é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      paymentPayload.token = cardToken;
      paymentPayload.installments = installments;
      paymentPayload.capture = true;
    } else if (method === "boleto") {
      paymentPayload.payment_method_id = "bolbradesco";
      paymentPayload.date_of_expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    } else if (method === "wallet") {
      // MercadoPago Wallet — create a preference and redirect
      const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{
            title: `Pedido #${order.order_number || orderId}`,
            quantity: 1,
            unit_price: Number(order.order_final_price),
            currency_id: "BRL",
          }],
          payer: {
            email: payerEmail || order.client_email || "comprador@email.com",
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
          payment_methods: {
            excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
          },
        }),
      });

      const pref = await prefRes.json();
      if (pref.error) {
        console.error("MP preference error:", pref);
        return new Response(JSON.stringify({ error: pref.message || "Erro ao criar preferência" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update order
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

    if (payment.error) {
      console.error("MP error:", payment);
      return new Response(JSON.stringify({ error: payment.message || "Erro no MercadoPago", details: payment.cause }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    } else if (method === "boleto") {
      response.boletoUrl = payment.transaction_details?.external_resource_url;
      response.boletoBarcode = payment.barcode?.content;
      response.boletoExpiration = payment.date_of_expiration;
    }

    // Update order with payment info
    await supabase.from("orders").update({
      coinzz_order_hash: payment.id?.toString(),
      payment_method: method,
      status: payment.status === "approved" ? "Aprovado" : "Aguardando",
    }).eq("id", orderId);

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("create-payment error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao processar pagamento" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
