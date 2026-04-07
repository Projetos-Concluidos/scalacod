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
    const { order_id, user_id, mode } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveUserId = user_id || order.user_id;
    const logisticsType = mode || order.logistics_type || "hyppe_cod";
    console.log("[hyppe-create-order] Processing:", order_id, "mode:", logisticsType);

    // 2. Skip if not hyppe
    if (!logisticsType.startsWith("hyppe")) {
      return new Response(JSON.stringify({ skipped: true, reason: "not hyppe logistics" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get Hyppe integration
    const { data: integrations } = await admin
      .from("integrations")
      .select("*")
      .eq("user_id", effectiveUserId)
      .eq("type", "hyppe")
      .eq("is_active", true);
    const hyppeInt = (integrations || [])[0];
    const apiToken = (hyppeInt?.config as any)?.api_token;

    if (!apiToken) {
      return new Response(JSON.stringify({ error: "Hyppe token not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Get hyppe offer data from checkout
    let hyppeOfferData: any = null;
    if (order.checkout_id) {
      const { data: checkout } = await admin
        .from("checkouts")
        .select("hyppe_offer_data")
        .eq("id", order.checkout_id)
        .maybeSingle();
      hyppeOfferData = (checkout as any)?.hyppe_offer_data;
    }

    const hyppeProductId = hyppeOfferData?.hyppe_product_id;
    const hyppeOfferId = hyppeOfferData?.hyppe_offer_id;

    // 5. Resolve city/neighborhood via Hyppe API
    let cidadeId: number | null = null;
    let bairroId: number | null = null;
    const cityName = `${order.client_address_city} - ${order.client_address_state}`.toUpperCase();

    try {
      const cidadeRes = await fetch("https://app.hyppe.com.br/api/checkout/cidade", {
        method: "POST",
        headers: { Authorization: apiToken, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ cidade: cityName, bairro: order.client_address_district, cadastrar_cidade: true }),
        redirect: "manual",
      });
      if (cidadeRes.ok) {
        const cidadeData = await cidadeRes.json();
        cidadeId = cidadeData?.cidade_id || null;
        bairroId = cidadeData?.bairro_id || null;
        console.log("[hyppe-create-order] City resolved:", cidadeId, "Bairro:", bairroId);
      }
    } catch (e: any) {
      console.warn("[hyppe-create-order] City lookup error:", e.message);
    }

    // 6. Build payload based on mode
    const cleanPhone = (order.client_phone || "").replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 11
      ? `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`
      : cleanPhone;

    let endpoint: string;
    let payload: any;

    if (logisticsType === "hyppe_antecipado") {
      // Prepaid mode - need shipping options first
      let freteSelecionado: any = null;
      try {
        const freteRes = await fetch("https://app.hyppe.com.br/api/checkout/fretes", {
          method: "POST",
          headers: { Authorization: apiToken, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            endereco: { cep: (order.client_zip_code || "").replace(/\D/g, "") },
            produtos: hyppeProductId ? [{ produto_id: hyppeProductId, oferta: { id: hyppeOfferId, quantidade: order.order_quantity || 1 } }] : [],
          }),
          redirect: "manual",
        });
        if (freteRes.ok) {
          const freteData = await freteRes.json();
          const cds = Array.isArray(freteData) ? freteData : [];
          if (cds.length > 0 && cds[0]?.fretes?.length > 0) {
            const cheapest = cds[0].fretes[0];
            freteSelecionado = {
              centro_distribuicao_id: cds[0].id,
              nome_cd: cds[0].nome,
              fretamento: cheapest,
            };
          }
        }
      } catch (e: any) {
        console.warn("[hyppe-create-order] Frete lookup error:", e.message);
      }

      endpoint = "https://app.hyppe.com.br/api/checkout/pedidos/antecipado";
      payload = {
        origem_integracao: "ScalaCOD",
        cliente: {
          nome: order.client_name,
          whatsapp: formattedPhone,
          cpf_cnpj_cliente: (order.client_document || "").replace(/\D/g, ""),
        },
        endereco: {
          cep: (order.client_zip_code || "").replace(/\D/g, ""),
          endereco: order.client_address,
          numero: order.client_address_number,
          cidade_id: cidadeId,
          bairro_id: bairroId,
          nome_cidade: cityName,
          nome_uf: order.client_address_state,
        },
        freteSelecionado,
        produtos: hyppeProductId ? [{
          produto_id: hyppeProductId,
          nome: hyppeOfferData?.product_name || order.client_name,
          oferta: {
            id: hyppeOfferId,
            quantidade: order.order_quantity || 1,
            valor_venda: Number(order.order_final_price),
            percentual_comissao: hyppeOfferData?.commission_percent || 10,
          },
        }] : [],
      };
    } else {
      // COD mode
      const deliveryDate = order.delivery_date
        ? (() => {
            const d = new Date(order.delivery_date + "T12:00:00");
            return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
          })()
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + 3);
            return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
          })();

      endpoint = "https://app.hyppe.com.br/api/checkout/pedidos/cod";
      payload = {
        origem_integracao: "ScalaCOD",
        cliente: {
          nome: order.client_name,
          whatsapp: formattedPhone,
        },
        endereco: {
          cep: (order.client_zip_code || "").replace(/\D/g, ""),
          endereco: order.client_address,
          numero: order.client_address_number,
          cidade_id: cidadeId,
          bairro_id: bairroId,
          nome_cidade: cityName,
          nome_uf: order.client_address_state,
        },
        data_agendamento: deliveryDate,
        produtos: hyppeProductId ? [{
          produto_id: hyppeProductId,
          nome: hyppeOfferData?.product_name || "Produto",
          oferta: {
            id: hyppeOfferId,
            quantidade: order.order_quantity || 1,
            valor_venda: Number(order.order_final_price),
            percentual_comissao: hyppeOfferData?.commission_percent || 10,
          },
        }] : [],
      };
    }

    console.log("[hyppe-create-order] Sending to:", endpoint);
    console.log("[hyppe-create-order] Payload:", JSON.stringify(payload));

    // 7. Send to Hyppe
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "manual",
    });

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const raw = await res.text();
      console.error("[hyppe-create-order] Non-JSON response:", raw.substring(0, 500));
      return new Response(JSON.stringify({ success: false, error: "Resposta não-JSON da Hyppe" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await res.json();
    console.log("[hyppe-create-order] Response:", JSON.stringify(result));

    const hyppeOrderId = result?.pedido_id || result?.pedido?.id || null;

    if (res.ok && hyppeOrderId) {
      // Update order with hyppe_order_id
      await admin.from("orders").update({
        hyppe_order_id: String(hyppeOrderId),
        status: logisticsType === "hyppe_cod" ? "Agendado" : "Aguardando",
        updated_at: new Date().toISOString(),
      }).eq("id", order_id);

      await admin.from("order_status_history").insert({
        order_id,
        from_status: order.status,
        to_status: logisticsType === "hyppe_cod" ? "Agendado" : "Aguardando",
        source: "hyppe_create_order",
        raw_payload: { hyppe_order_id: hyppeOrderId, mode: logisticsType },
      });

      // Trigger flow
      try {
        await fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ userId: effectiveUserId, orderId: order_id, newStatus: logisticsType === "hyppe_cod" ? "Agendado" : "Aguardando", triggerEvent: "order_status_changed" }),
        });
      } catch {}

      return new Response(JSON.stringify({ success: true, hyppe_order_id: String(hyppeOrderId) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const errorMsg = result?.message || result?.error || JSON.stringify(result).slice(0, 300);
      await admin.from("order_status_history").insert({
        order_id,
        from_status: order.status,
        to_status: "hyppe_error",
        source: "hyppe_create_order",
        raw_payload: { error: errorMsg, status: res.status },
      });

      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    console.error("[hyppe-create-order] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
