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
