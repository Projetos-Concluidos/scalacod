import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit: 30 requests per 60 seconds
  const { limited } = await checkRateLimit(req, {
    action: "checkout-api",
    windowSeconds: 60,
    maxAttempts: 30,
  });
  if (limited) return rateLimitResponse(corsHeaders, 60);

  try {
    const body = await req.json();
    const { action, user_id, cep, order_data } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user integrations (include inactive for test/sync actions)
    const skipActiveFilter = ["test_connection", "sync_logzz_products", "test_logzz_mapping"].includes(action);
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

      const cleanCep = cep.replace(/\D/g, "");
      console.log("[CEP] Iniciando verificação para:", cleanCep);

      // Helper: fetch ViaCEP with BrasilAPI fallback
      const fetchViaCep = async (c: string) => {
        try {
          const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
          const d = await r.json();
          if (d.erro) throw new Error("CEP não encontrado");
          console.log("[CEP] ViaCEP result:", d.logradouro, d.bairro, d.localidade, d.uf);
          return { street: d.logradouro || null, neighborhood: d.bairro || null, city: d.localidade || null, state: d.uf || null };
        } catch {
          try {
            const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${c}`);
            const d = await r.json();
            return { street: d.street || null, neighborhood: d.neighborhood || null, city: d.city || null, state: d.state || null };
          } catch {
            return { street: null, neighborhood: null, city: null, state: null };
          }
        }
      };

      const logzz = getIntegration("logzz");
      const logzzToken = (logzz?.config as any)?.bearer_token;
      console.log("[CEP] Logzz token configurado:", !!logzzToken);

      if (!logzz?.config || !logzzToken) {
        console.log("[CEP] Sem token Logzz → fallback Correios");
        const addr = await fetchViaCep(cleanCep);
        return new Response(
          JSON.stringify({ provider: "coinzz", dates: [], message: "Logzz não configurado", ...addr, zipCode: cleanCep }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const logzzUrl = `https://app.logzz.com.br/api/delivery-day/options/zip-code/${cleanCep}`;
        console.log("[CEP] Chamando Logzz:", logzzUrl);
        const res = await fetch(logzzUrl, {
          headers: { Authorization: `Bearer ${logzzToken}`, Accept: "application/json", "User-Agent": "Mozilla/5.0 Chrome/120" },
        });
        const rawCep = await res.text();
        console.log("[CEP] Logzz response status:", res.status);
        console.log("[CEP] Logzz raw body:", rawCep.substring(0, 800));
        
        if (res.status === 403) throw new Error("Logzz 403 Forbidden - token may be expired");
        if (res.status >= 300) throw new Error(`Logzz returned status ${res.status}`);
        
        let data: any;
        try { data = JSON.parse(rawCep); } catch { throw new Error("Invalid Logzz JSON response"); }
        
        // Resilient date extraction - try multiple response structures
        let datesAvailable: any[] = [];
        let respObj: any = null;
        
        // Structure 1: { data: { response: { dates_available: [...] } } }
        if (data?.data?.response?.dates_available?.length > 0) {
          datesAvailable = data.data.response.dates_available;
          respObj = data.data.response;
        }
        // Structure 2: { response: { dates_available: [...] } }
        else if (data?.response?.dates_available?.length > 0) {
          datesAvailable = data.response.dates_available;
          respObj = data.response;
        }
        // Structure 3: { data: { dates_available: [...] } }
        else if (data?.data?.dates_available?.length > 0) {
          datesAvailable = data.data.dates_available;
          respObj = data.data;
        }
        // Structure 4: { dates_available: [...] }
        else if (data?.dates_available?.length > 0) {
          datesAvailable = data.dates_available;
          respObj = data;
        }
        // Structure 5: root is array of dates
        else if (Array.isArray(data) && data.length > 0 && data[0]?.date) {
          datesAvailable = data;
          respObj = {};
        }
        // Structure 6: { data: [...] } flat array
        else if (Array.isArray(data?.data) && data.data.length > 0 && data.data[0]?.date) {
          datesAvailable = data.data;
          respObj = {};
        }
        
        console.log("[CEP] Parsed dates_available:", datesAvailable.length, "keys:", Object.keys(data || {}).join(","));

        if (datesAvailable.length > 0) {
          const dates = datesAvailable.map((d: any) => ({
            date: d.date, type: d.type || "Padrão", price: d.price || 0,
          }));
          const addr = await fetchViaCep(cleanCep);
          console.log("[CEP] Provider escolhido: logzz, datas:", dates.length);
          return new Response(
            JSON.stringify({
              provider: "logzz", dates, ...addr, zipCode: cleanCep,
              city: respObj?.city || addr.city, state: respObj?.state || addr.state,
              operationName: respObj?.local_operation_name,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log("[CEP] Logzz não atende → fallback Correios. Errors:", data.errors);
        throw new Error("No dates available");
      } catch (err) {
        console.log("[CEP] Fallback Correios. Erro:", (err as Error).message);
        const addr = await fetchViaCep(cleanCep);
        console.log("[CEP] Provider escolhido: coinzz");
        return new Response(
          JSON.stringify({
            provider: "coinzz", dates: [], message: "Logzz indisponível para este CEP",
            ...addr, zipCode: cleanCep, reason: "Área fora de cobertura Logzz — entrega pelos Correios",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── ACTION: create_order ─────────────────────────
    if (action === "create_order") {
      if (!order_data) {
        return new Response(JSON.stringify({ error: "order_data required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        console.log("[create_order] Creating order for user:", user_id);
        const { data: inserted, error: orderErr } = await supabase.from("orders").insert({
          user_id,
          order_number: order_data.order_number,
          checkout_id: order_data.checkout_id || null,
          offer_id: order_data.offer_id || null,
          client_name: order_data.client_name,
          client_email: order_data.client_email || null,
          client_document: order_data.client_document || null,
          client_phone: order_data.client_phone,
          client_zip_code: order_data.client_zip_code,
          client_address: order_data.client_address,
          client_address_number: order_data.client_address_number,
          client_address_comp: order_data.client_address_comp || null,
          client_address_district: order_data.client_address_district,
          client_address_city: order_data.client_address_city,
          client_address_state: order_data.client_address_state,
          order_final_price: order_data.order_final_price,
          shipping_value: order_data.shipping_value || 0,
          status: order_data.status || "Aguardando",
          logistics_type: order_data.logistics_type || "logzz",
          delivery_date: order_data.delivery_date || null,
          payment_method: order_data.payment_method || null,
          utm_source: order_data.utm_source || null,
          utm_medium: order_data.utm_medium || null,
          utm_campaign: order_data.utm_campaign || null,
          utm_content: order_data.utm_content || null,
          utm_term: order_data.utm_term || null,
          utm_id: order_data.utm_id || null,
        }).select("id").single();

        if (orderErr) {
          console.error("[create_order] Order insert error:", orderErr.message);
          throw new Error(orderErr.message);
        }
        console.log("[create_order] Order created:", inserted?.id);

        // Upsert lead
        if (order_data.client_phone) {
          const { error: leadErr } = await supabase.from("leads").upsert({
            user_id,
            name: order_data.client_name,
            phone: order_data.client_phone,
            email: order_data.client_email || null,
            document: order_data.client_document || null,
            status: "Confirmado",
          }, { onConflict: "user_id,phone" });
          if (leadErr) console.log("[create_order] Lead upsert error:", leadErr.message);
        }

        // If logistics_type is logzz, delegate to dedicated logzz-create-order function
        let logzz_order_id: string | null = null;
        if (order_data.logistics_type === "logzz") {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            console.log("[create_order] Delegating to logzz-create-order for order:", inserted?.id);
            const logzzRes = await fetch(`${supabaseUrl}/functions/v1/logzz-create-order`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ order_id: inserted?.id, user_id }),
            });
            const logzzResult = await logzzRes.json();
            console.log("[create_order] logzz-create-order result:", JSON.stringify(logzzResult));
            if (logzzResult?.success) {
              logzz_order_id = logzzResult.logzz_order_id || null;
            }
          } catch (logzzErr: any) {
            console.error("[create_order] Logzz sync error:", logzzErr.message);
          }
        }

        return new Response(JSON.stringify({ order_id: inserted?.id, logzz_order_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

      try {
        console.log("[sync_logzz] Calling GET /api/v1/products");
        const res = await fetch("https://app.logzz.com.br/api/v1/products", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          redirect: "manual",
        });

        const status = res.status;
        console.log(`[sync_logzz] Status: ${status}`);

        if (status >= 300 && status < 400) {
          throw new Error("Logzz redirecionou (token pode estar expirado)");
        }

        if (status !== 200) {
          throw new Error(`Logzz retornou status ${status}`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
          throw new Error("Logzz retornou HTML. Token pode estar expirado.");
        }

        const data = await res.json();
        console.log(`[sync_logzz] Response keys: ${Object.keys(data || {}).join(",")}`);

        // Logzz wraps response: { type, status, data: { producer: [...], affiliate: [...], coproducer: [...] } }
        const actualData = data?.data || data;
        const roles = ["producer", "affiliate", "coproducer"];
        const fetchedOffers: any[] = [];

        for (const role of roles) {
          const products = actualData?.[role];
          if (!Array.isArray(products)) continue;

          for (const product of products) {
            const productName = product.name || "Produto Logzz";
            const productHash = product.hash || null;
            const productOffers = product.offers;

            if (Array.isArray(productOffers)) {
              for (const offer of productOffers) {
                fetchedOffers.push({
                  product_name: productName,
                  product_hash: productHash,
                  offer_name: offer.name || productName,
                  offer_hash: offer.hash || null,
                  price: parseFloat(offer.price || "0"),
                  role,
                });
              }
            } else {
              fetchedOffers.push({
                product_name: productName,
                product_hash: productHash,
                offer_name: productName,
                offer_hash: productHash,
                price: parseFloat(product.price || "0"),
                role,
              });
            }
          }
        }

        console.log(`[sync_logzz] Extracted ${fetchedOffers.length} offers`);

        if (fetchedOffers.length > 0) {
          let newProducts = 0;
          let newOffers = 0;

          for (const item of fetchedOffers) {
            try {
              const offerName = item.offer_name;
              const offerPrice = item.price;
              const offerHash = item.offer_hash;
              const productName = item.product_name;
              const productHash = item.product_hash;

              // Upsert product
              let productId: string | null = null;

              if (productHash) {
                const { data: existingProd } = await supabase
                  .from("products")
                  .select("id")
                  .eq("user_id", user_id)
                  .eq("hash", productHash)
                  .maybeSingle();
                if (existingProd) productId = existingProd.id;
              }

              if (!productId) {
                const { data: prodByName } = await supabase
                  .from("products")
                  .select("id")
                  .eq("user_id", user_id)
                  .eq("name", productName)
                  .maybeSingle();
                if (prodByName) productId = prodByName.id;
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
              message: `Importadas ${fetchedOffers.length} ofertas da Logzz (${newProducts} novos produtos, ${newOffers} novas ofertas).`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.log(`[sync_logzz] Error: ${e.message}`);
      }

      // Fallback: return local offers
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

    // ─── ACTION: validate_cpf ───────────────────────
    if (action === "validate_cpf") {
      const cpf = body.cpf?.replace(/\D/g, "");
      if (!cpf || cpf.length !== 11) {
        return new Response(
          JSON.stringify({ valid: false, status: "invalid", message: "CPF inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Local CPF algorithm validation
      const isValidAlgo = (() => {
        if (/^(\d)\1+$/.test(cpf)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
        let rest = (sum * 10) % 11;
        if (rest === 10) rest = 0;
        if (rest !== parseInt(cpf[9])) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
        rest = (sum * 10) % 11;
        if (rest === 10) rest = 0;
        return rest === parseInt(cpf[10]);
      })();

      if (!isValidAlgo) {
        return new Response(
          JSON.stringify({ valid: false, status: "invalid", message: "CPF inválido (dígito verificador incorreto)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try Logzz API validation
      const logzz = getIntegration("logzz");
      const token = (logzz?.config as any)?.bearer_token;

      if (token) {
        try {
          // Check if CPF is blocked/blacklisted in Logzz
          const res = await fetch(
            `https://app.logzz.com.br/api/v1/customer/validate-document/${cpf}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            }
          );

          if (res.ok) {
            const data = await res.json();
            const blocked = data?.blocked === true || data?.data?.blocked === true || data?.status === "blocked";
            if (blocked) {
              return new Response(
                JSON.stringify({
                  valid: false,
                  status: "blocked",
                  message: "CPF bloqueado para compras",
                  source: "logzz",
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({
                valid: true,
                status: "approved",
                message: "CPF verificado na Logzz",
                source: "logzz",
                customer_name: data?.name || data?.data?.name || null,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // If endpoint doesn't exist (404/405), fallback to local validation
          console.log(`[validate_cpf] Logzz returned ${res.status}, falling back to local`);
        } catch (e) {
          console.log(`[validate_cpf] Logzz error: ${e.message}, falling back to local`);
        }
      }

      // Fallback: local validation passed
      return new Response(
        JSON.stringify({
          valid: true,
          status: "approved",
          message: "CPF válido",
          source: "local",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: get_mp_fees ────────────────────────────
    if (action === "get_mp_fees") {
      const mp = getIntegration("mercadopago");
      const feePercent = (mp?.config as any)?.processing_fee_percent || 0;
      return new Response(
        JSON.stringify({ processing_fee_percent: feePercent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: get_mp_public_key ───────────────────────
    if (action === "get_mp_public_key") {
      const mp = getIntegration("mercadopago");
      if (!mp?.config) {
        return new Response(
          JSON.stringify({ error: "MercadoPago não configurado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const publicKey = (mp.config as any)?.public_key;
      if (!publicKey) {
        return new Response(
          JSON.stringify({ error: "Public Key não configurada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ public_key: publicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: process_logzz_webhook ────────────────
    if (action === "process_logzz_webhook") {
      const { order_id, logzz_order_id, status: rawStatus, payload } = body;

      // Inline status mapping (Logzz → ScalaNinja)
      const LOGZZ_MAP: Record<string, string> = {
        'Pendente': 'Aguardando', 'Em aberto': 'Aguardando', 'Aguardando': 'Aguardando', 'A enviar': 'Aguardando',
        'Confirmado': 'Confirmado', 'Agendado': 'Agendado', 'Reagendado': 'Agendado',
        'Em separação': 'Em Separação', 'Separado': 'Separado',
        'Enviado': 'Em Rota', 'Em Rota': 'Em Rota', 'A caminho': 'Em Rota', 'Saiu para entrega': 'Em Rota', 'Enviando': 'Em Rota',
        'Entregue': 'Entregue', 'Completo': 'Entregue',
        'Frustrado': 'Frustrado', 'Tentativa frustrada': 'Frustrado', 'Atrasado': 'Frustrado', 'Sem sucesso': 'Frustrado',
        'A reagendar': 'Reagendar',
        'Cancelado': 'Cancelado', 'Reembolsado': 'Reembolsado', 'Reembolso em andamento': 'Reembolsado',
        'Estoque insuficiente': 'Cancelado', 'Aguardando retirada na agência': 'Em Rota',
        'pending': 'Aguardando', 'confirmed': 'Confirmado', 'scheduled': 'Agendado',
        'separated': 'Em Separação', 'in_route': 'Em Rota', 'delivered': 'Entregue',
        'frustrated': 'Frustrado', 'canceled': 'Cancelado', 'rescheduled': 'Reagendar',
      };

      const mapStatus = (s: string): string => {
        if (!s) return 'Aguardando';
        if (LOGZZ_MAP[s]) return LOGZZ_MAP[s];
        const lower = s.toLowerCase();
        for (const [k, v] of Object.entries(LOGZZ_MAP)) { if (k.toLowerCase() === lower) return v; }
        if (lower.includes('entregue') || lower.includes('completo')) return 'Entregue';
        if (lower.includes('rota') || lower.includes('caminho') || lower.includes('enviado')) return 'Em Rota';
        if (lower.includes('frustr')) return 'Frustrado';
        if (lower.includes('cancela')) return 'Cancelado';
        if (lower.includes('separa')) return 'Em Separação';
        if (lower.includes('agendado')) return 'Agendado';
        console.warn('[StatusMap] Unmapped Logzz status:', s);
        return s;
      };

      const newStatus = mapStatus(rawStatus);
      console.log(`[Webhook Logzz] Status: "${rawStatus}" → "${newStatus}"`);

      // Find order
      let matchQuery = supabase.from("orders").select("id, status").limit(1);
      if (order_id) {
        matchQuery = matchQuery.eq("id", order_id);
      } else if (logzz_order_id) {
        matchQuery = matchQuery.eq("logzz_order_id", logzz_order_id);
      } else {
        return new Response(JSON.stringify({ error: "order_id or logzz_order_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: order } = await matchQuery.single();
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const fromStatus = order.status;

      // Update order status
      await supabase.from("orders").update({
        status: newStatus,
        status_description: rawStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);

      // Insert status history
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        from_status: fromStatus,
        to_status: newStatus,
        source: "logzz_webhook",
        raw_payload: payload || { raw_status: rawStatus },
      });

      // P1: Trigger flow notifications for this status change
      if (fromStatus !== newStatus) {
        try {
          // Get order user_id for trigger-flow
          const { data: fullOrder } = await supabase
            .from("orders")
            .select("user_id")
            .eq("id", order.id)
            .single();

          if (fullOrder?.user_id) {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            console.log(`[process_logzz_webhook] Triggering flows for status change: ${fromStatus} → ${newStatus}`);
            
            const triggerRes = await fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: fullOrder.user_id,
                orderId: order.id,
                newStatus,
                triggerEvent: "order_status_changed",
              }),
            });
            const triggerResult = await triggerRes.json();
            console.log(`[process_logzz_webhook] trigger-flow result:`, JSON.stringify(triggerResult));
          }
        } catch (triggerErr: any) {
          console.error(`[process_logzz_webhook] trigger-flow error (non-blocking):`, triggerErr.message);
        }
      }

      return new Response(JSON.stringify({
        success: true, from: fromStatus, to: newStatus, order_id: order.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── send_to_logzz: delegate to dedicated logzz-create-order function ──
    if (action === "send_to_logzz") {
      const { order_id } = body;
      if (!order_id) {
        return new Response(JSON.stringify({ error: "order_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        console.log("[send_to_logzz] Delegating to logzz-create-order for order:", order_id);

        const logzzRes = await fetch(`${supabaseUrl}/functions/v1/logzz-create-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ order_id, user_id }),
        });

        const result = await logzzRes.json();
        console.log("[send_to_logzz] Result:", JSON.stringify(result));

        return new Response(JSON.stringify(result), {
          status: logzzRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── test_logzz_mapping: send test payload to Logzz webhook ──
    if (action === "test_logzz_mapping") {
      try {
        const logzz = getIntegration("logzz");
        if (!logzz) {
          return new Response(JSON.stringify({ success: false, message: "Integração Logzz não encontrada. Salve o token primeiro." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const config = logzz.config as any;
        const logzzToken = config?.bearer_token;
        const webhookUrl = config?.logzz_webhook_url;

        if (!logzzToken) {
          return new Response(JSON.stringify({ success: false, message: "Bearer Token da Logzz não configurado." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!webhookUrl) {
          return new Response(JSON.stringify({ success: false, message: "URL de Importação da Logzz não configurada." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const testPayload = {
          external_id: `test-mapping-${Date.now()}`,
          full_name: "Teste Mapeamento ScalaNinja",
          phone: "11999999999",
          customer_document: "00000000000",
          postal_code: "59015070",
          street: "Rua Teste Mapeamento",
          neighborhood: "Centro",
          city: "Natal",
          state: "rn",
          house_number: "1",
          complement: "",
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          offer: "teste-mapeamento",
        };

        console.log("[test_logzz_mapping] Sending test payload to:", webhookUrl);
        console.log("[test_logzz_mapping] Payload:", JSON.stringify(testPayload));

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Authorization": `bearer ${logzzToken}`,
          },
          body: JSON.stringify(testPayload),
        });

        const responseText = await res.text();
        console.log("[test_logzz_mapping] Status:", res.status, "Response:", responseText);

        let responseData: any = null;
        try { responseData = JSON.parse(responseText); } catch { responseData = responseText; }

        if (res.ok) {
          return new Response(JSON.stringify({
            success: true,
            message: `Evento de mapeamento enviado com sucesso! (HTTP ${res.status})`,
            logzz_response: responseData,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            message: `Logzz retornou HTTP ${res.status}. ${res.status === 403 ? "Verifique o hash da URL de importação no painel Logzz." : "Verifique o token e a URL."}`,
            status_code: res.status,
            logzz_response: responseData,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e: any) {
        console.error("[test_logzz_mapping] Error:", e.message);
        return new Response(JSON.stringify({ success: false, message: e.message || "Erro ao disparar mapeamento" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
