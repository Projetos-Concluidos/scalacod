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
    if (action === "sync_logzz_products") {
      const logzz = getIntegration("logzz");
      if (!logzz?.config) {
        return new Response(
          JSON.stringify({ error: "Logzz não configurado. Salve o token e a URL de webhook primeiro." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = (logzz.config as any).bearer_token;
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token Logzz ausente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try multiple candidate endpoints to fetch affiliate offers
      const candidateEndpoints = [
        "https://app.logzz.com.br/api/affiliate/offers",
        "https://app.logzz.com.br/api/v1/affiliate/offers",
        "https://app.logzz.com.br/api/offers",
        "https://app.logzz.com.br/api/v1/offers",
        "https://app.logzz.com.br/api/products",
        "https://app.logzz.com.br/api/v1/products",
        "https://app.logzz.com.br/api/affiliate/products",
      ];

      let fetchedOffers: any[] | null = null;
      let successEndpoint = "";

      for (const endpoint of candidateEndpoints) {
        try {
          console.log(`[sync_logzz] Trying: ${endpoint}`);
          const res = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            redirect: "manual",
          });

          const status = res.status;
          console.log(`[sync_logzz] ${endpoint} → status ${status}`);

          // If redirected (301/302/303/307/308) skip — likely login page
          if (status >= 300 && status < 400) {
            console.log(`[sync_logzz] Redirect detected, skipping`);
            continue;
          }

          if (status === 401 || status === 403) {
            console.log(`[sync_logzz] Auth error, skipping`);
            continue;
          }

          if (status === 404) {
            console.log(`[sync_logzz] Not found, skipping`);
            continue;
          }

          if (status !== 200) continue;

          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("json")) {
            const bodyPreview = await res.text();
            console.log(`[sync_logzz] Non-JSON response: ${bodyPreview.substring(0, 100)}`);
            continue;
          }

          const data = await res.json();
          console.log(`[sync_logzz] JSON response type: ${typeof data}, isArray: ${Array.isArray(data)}`);

          // Extract offers array from various response shapes
          let items: any[] = [];
          if (Array.isArray(data)) {
            items = data;
          } else if (data?.data && Array.isArray(data.data)) {
            items = data.data;
          } else if (data?.offers && Array.isArray(data.offers)) {
            items = data.offers;
          } else if (data?.products && Array.isArray(data.products)) {
            items = data.products;
          } else if (data?.items && Array.isArray(data.items)) {
            items = data.items;
          }

          if (items.length > 0) {
            fetchedOffers = items;
            successEndpoint = endpoint;
            console.log(`[sync_logzz] Found ${items.length} offers from ${endpoint}`);
            break;
          } else {
            console.log(`[sync_logzz] Empty array from ${endpoint}, continuing`);
          }
        } catch (e) {
          console.log(`[sync_logzz] Error on ${endpoint}: ${e.message}`);
          continue;
        }
      }

      // If we fetched offers, upsert them into the database
      if (fetchedOffers && fetchedOffers.length > 0) {
        let newProducts = 0;
        let newOffers = 0;

        for (const item of fetchedOffers) {
          try {
            const offerName = item.name || item.offer_name || item.title || "Oferta Logzz";
            const offerPrice = parseFloat(item.price || item.value || item.amount || "0");
            const offerHash = item.hash || item.id?.toString() || item.slug || null;
            const productName = item.product_name || item.product?.name || offerName;
            const productHash = item.product_hash || item.product?.hash || item.product_id?.toString() || null;

            // Upsert product
            let productId: string | null = null;

            if (productHash) {
              const { data: existingProd } = await supabase
                .from("products")
                .select("id")
                .eq("user_id", user_id)
                .eq("hash", productHash)
                .maybeSingle();

              if (existingProd) {
                productId = existingProd.id;
              }
            }

            if (!productId) {
              const { data: prodByName } = await supabase
                .from("products")
                .select("id")
                .eq("user_id", user_id)
                .eq("name", productName)
                .maybeSingle();

              if (prodByName) {
                productId = prodByName.id;
              }
            }

            if (!productId) {
              const { data: newProd, error: prodErr } = await supabase
                .from("products")
                .insert({ user_id, name: productName, hash: productHash, is_active: true })
                .select("id")
                .single();

              if (prodErr) {
                console.log(`[sync_logzz] Error creating product: ${prodErr.message}`);
                continue;
              }
              productId = newProd.id;
              newProducts++;
            }

            // Upsert offer
            let existingOffer = null;
            if (offerHash) {
              const { data } = await supabase
                .from("offers")
                .select("id")
                .eq("user_id", user_id)
                .eq("hash", offerHash)
                .maybeSingle();
              existingOffer = data;
            }

            if (!existingOffer) {
              const { data } = await supabase
                .from("offers")
                .select("id")
                .eq("user_id", user_id)
                .eq("name", offerName)
                .eq("product_id", productId)
                .maybeSingle();
              existingOffer = data;
            }

            if (existingOffer) {
              await supabase.from("offers").update({
                price: offerPrice,
                hash: offerHash,
                is_active: true,
              }).eq("id", existingOffer.id);
            } else {
              const { error: offErr } = await supabase.from("offers").insert({
                user_id,
                product_id: productId,
                name: offerName,
                price: offerPrice,
                hash: offerHash,
                is_active: true,
              });
              if (offErr) {
                console.log(`[sync_logzz] Error creating offer: ${offErr.message}`);
                continue;
              }
              newOffers++;
            }
          } catch (e) {
            console.log(`[sync_logzz] Error processing item: ${e.message}`);
          }
        }

        // Fetch all current offers to return
        const { data: allOffers } = await supabase
          .from("offers")
          .select("id, name, price, hash, product_id, products(name)")
          .eq("user_id", user_id)
          .eq("is_active", true);

        return new Response(
          JSON.stringify({
            success: true,
            synced: fetchedOffers.length,
            products: newProducts,
            offers: newOffers,
            items: allOffers || [],
            source: successEndpoint,
            message: `Importadas ${fetchedOffers.length} ofertas da Logzz (${newProducts} novos produtos, ${newOffers} novas ofertas).`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback: no API endpoint worked, return local offers
      const { data: existingOffers } = await supabase
        .from("offers")
        .select("id, name, price, hash, product_id, products(name)")
        .eq("user_id", user_id)
        .eq("is_active", true);

      return new Response(
        JSON.stringify({
          success: true,
          synced: existingOffers?.length || 0,
          products: 0,
          offers: existingOffers?.length || 0,
          items: existingOffers || [],
          api_unavailable: true,
          message: "A API da Logzz não disponibiliza endpoint público para listar ofertas de afiliado. As ofertas locais foram carregadas. Para importar novas ofertas, crie-as manualmente ou configure o webhook da Logzz para enviar dados automaticamente.",
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
