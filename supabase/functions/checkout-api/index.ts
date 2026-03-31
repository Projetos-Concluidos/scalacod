import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, user_id, cep, order_data } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user integrations (include inactive for test/sync actions)
    const skipActiveFilter = ["test_connection", "sync_logzz_products"].includes(action);
    let intQuery = supabase.from("integrations").select("*").eq("user_id", user_id);
    if (!skipActiveFilter) {
      intQuery = intQuery.eq("is_active", true);
    }
    const { data: integrations } = await intQuery;

    const getIntegration = (type: string) =>
      integrations?.find((i: any) => i.type === type);

    // ─── ACTION: check_delivery ───────────────────────
    if (action === "check_delivery") {
      if (!cep) {
        return new Response(JSON.stringify({ error: "CEP required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const logzz = getIntegration("logzz");
      if (!logzz?.config) {
        return new Response(
          JSON.stringify({ provider: "coinzz", dates: [], message: "Logzz não configurado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = (logzz.config as any).bearer_token;
      if (!token) {
        return new Response(
          JSON.stringify({ provider: "coinzz", dates: [], message: "Token Logzz ausente" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const cleanCep = cep.replace(/\D/g, "");
        const res = await fetch(
          `https://app.logzz.com.br/api/delivery-day/options/zip-code/${cleanCep}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        const rawCep = await res.text();
        let data: any;
        try { data = JSON.parse(rawCep); } catch { throw new Error("Invalid response"); }

        if (data.success && data.data?.response?.dates_available?.length > 0) {
          const dates = data.data.response.dates_available.map((d: any) => ({
            date: d.date,
            type: d.type || "Padrão",
            price: d.price || 0,
          }));
          return new Response(
            JSON.stringify({ provider: "logzz", dates }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error("No dates available");
      } catch {
        return new Response(
          JSON.stringify({ provider: "coinzz", dates: [], message: "Logzz indisponível para este CEP" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── ACTION: create_pix ───────────────────────────
    if (action === "create_pix") {
      const mp = getIntegration("mercadopago");
      if (!mp?.config) {
        return new Response(
          JSON.stringify({ error: "MercadoPago não configurado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accessToken = (mp.config as any).access_token;
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: "Access token MercadoPago ausente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const res = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            transaction_amount: order_data.amount,
            description: order_data.description || "Pedido ScalaNinja",
            payment_method_id: "pix",
            payer: {
              email: order_data.email || "cliente@scalaninja.com",
              first_name: order_data.name?.split(" ")[0] || "Cliente",
              last_name: order_data.name?.split(" ").slice(1).join(" ") || "",
              identification: order_data.document
                ? { type: "CPF", number: order_data.document.replace(/\D/g, "") }
                : undefined,
            },
          }),
        });

        const data = await res.json();
        if (data.id) {
          return new Response(
            JSON.stringify({
              payment_id: data.id,
              qr_code: data.point_of_interaction?.transaction_data?.qr_code || null,
              qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
              ticket_url: data.point_of_interaction?.transaction_data?.ticket_url || null,
              status: data.status,
              expires_at: data.date_of_expiration,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(data.message || "Erro ao criar PIX");
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── ACTION: create_coinzz_order ──────────────────
    if (action === "create_coinzz_order") {
      const coinzz = getIntegration("coinzz");
      if (!coinzz?.config) {
        return new Response(
          JSON.stringify({ error: "Coinzz não configurado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = (coinzz.config as any).bearer_token;
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token Coinzz ausente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const res = await fetch("https://app.coinzz.com.br/api/orders", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer: {
              name: order_data.name,
              phone: order_data.phone,
              email: order_data.email,
              document: order_data.document,
            },
            shipping: {
              zip_code: order_data.cep,
              address: order_data.address,
              number: order_data.address_number,
              complement: order_data.complement,
              district: order_data.district,
              city: order_data.city,
              state: order_data.state,
            },
            items: order_data.items || [],
            total: order_data.amount,
          }),
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── ACTION: check_pix_status ─────────────────────
    if (action === "check_pix_status") {
      const mp = getIntegration("mercadopago");
      if (!mp?.config) {
        return new Response(
          JSON.stringify({ error: "MercadoPago não configurado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accessToken = (mp.config as any).access_token;
      try {
        const res = await fetch(
          `https://api.mercadopago.com/v1/payments/${body.payment_id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        return new Response(
          JSON.stringify({ status: data.status, status_detail: data.status_detail }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── ACTION: sync_logzz_products ──────────────────
    // Logzz does NOT have a public REST API for fetching offers.
    // This action returns existing offers from the local database instead.
    if (action === "sync_logzz_products") {
      const logzz = getIntegration("logzz");
      if (!logzz?.config) {
        return new Response(
          JSON.stringify({ error: "Logzz não configurado. Salve o token e a URL de webhook primeiro." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return existing offers from the database for this user
      const { data: existingOffers, error: offErr } = await supabase
        .from("offers")
        .select("id, name, price, hash, product_id, products(name)")
        .eq("user_id", user_id)
        .eq("is_active", true);

      if (offErr) {
        return new Response(
          JSON.stringify({ error: "Erro ao buscar ofertas: " + offErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          synced: existingOffers?.length || 0,
          products: 0,
          offers: existingOffers?.length || 0,
          items: existingOffers || [],
          message: "Ofertas carregadas do banco de dados. Para adicionar novas ofertas, crie-as manualmente ou importe via webhook da Logzz.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: test_connection ──────────────────────
    // Tests the Logzz webhook URL by sending a test order payload
    if (action === "test_connection") {
      const logzz = getIntegration("logzz");
      if (!logzz?.config) {
        return new Response(
          JSON.stringify({ connected: false, error: "Logzz não configurado. Salve o token e a URL primeiro." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const config = logzz.config as any;
      const webhookUrl = config.logzz_webhook_url;
      const bearerToken = config.bearer_token;

      if (!webhookUrl) {
        return new Response(
          JSON.stringify({ connected: false, error: "URL de Importação de Pedidos não configurada." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const testPayload = {
          external_id: `test-scalaninja-${Date.now()}`,
          full_name: "Teste ScalaNinja",
          phone: "11999999999",
          customer_document: "00000000000",
          postal_code: "01310100",
          street: "Av Paulista",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "sp",
          house_number: "1000",
          complement: "",
          delivery_date: new Date().toISOString().split("T")[0],
          offer: "test_validation",
          affiliate_email: "",
        };

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

        console.log("Testing Logzz webhook:", webhookUrl);
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(testPayload),
        });

        const status = res.status;
        const bodyText = await res.text();
        console.log("Logzz webhook test response:", status, bodyText.substring(0, 200));

        const connected = status === 200 || status === 201 || status === 422 || status === 400;
        return new Response(
          JSON.stringify({
            connected,
            status,
            message: connected
              ? `Webhook Logzz respondeu (status ${status}). Conexão funcionando!`
              : `Logzz respondeu com status ${status}. Verifique a URL e o token.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("Logzz webhook test error:", e.message);
        return new Response(
          JSON.stringify({ connected: false, error: "Erro ao conectar: " + e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── ACTION: test_logzz_webhook ─────────────────
    if (action === "test_logzz_webhook") {
      const webhookUrl = body.webhook_url;
      const bearerToken = body.token;
      if (!webhookUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "URL do webhook não informada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const testPayload = {
          external_id: `test-${Date.now()}`,
          full_name: "Teste ScalaNinja",
          phone: "11999999999",
          customer_document: "00000000000",
          postal_code: "01310100",
          street: "Av Paulista",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "sp",
          house_number: "1000",
          complement: "",
          delivery_date: new Date().toISOString().split("T")[0],
          offer: "test_validation",
          affiliate_email: "",
        };

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(testPayload),
        });

        const status = res.status;
        console.log("Logzz webhook test response:", status);
        
        return new Response(
          JSON.stringify({ 
            success: status === 200 || status === 201 || status === 422 || status === 400,
            status,
            message: status === 200 || status === 201 ? "Webhook aceito" : `Resposta ${status} (conexão funcional)`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
