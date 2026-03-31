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
          JSON.stringify({ error: "Logzz não configurado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = (logzz.config as any).bearer_token;
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token Logzz ausente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const res = await fetch("https://app.logzz.com.br/api/offers", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          redirect: "manual",
        });
        
        // Handle redirects (token invalid → login page)
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location") || "unknown";
          console.error("Logzz redirected to:", loc);
          throw new Error(`Token Logzz inválido (redirecionado para login). Gere um novo token.`);
        }
        
        const raw = await res.text();
        console.log("Logzz response status:", res.status, "length:", raw.length, "preview:", raw.substring(0, 100));
        
        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          console.error("Logzz non-JSON body:", raw.substring(0, 300));
          throw new Error(`Logzz retornou HTML em vez de JSON (status ${res.status}). Token pode estar expirado.`);
        }

        if (!data.success && !data.data) {
          throw new Error(data.message || "Erro ao buscar ofertas da Logzz");
        }

        const offers = data.data || data;
        const results = { synced: 0, products: 0, offers: 0 };

        for (const item of (Array.isArray(offers) ? offers : [])) {
          // Upsert product
          const productPayload = {
            user_id,
            name: item.product_name || item.name || "Produto Logzz",
            hash: item.product_hash || item.hash || null,
            weight: item.weight || null,
            width: item.width || null,
            height: item.height || null,
            length: item.length || null,
            is_active: true,
          };

          let productId: string;
          if (item.product_hash) {
            const { data: existingProduct } = await supabase
              .from("products")
              .select("id")
              .eq("user_id", user_id)
              .eq("hash", item.product_hash)
              .maybeSingle();

            if (existingProduct) {
              productId = existingProduct.id;
              await supabase.from("products").update(productPayload).eq("id", productId);
            } else {
              const { data: newProduct } = await supabase
                .from("products")
                .insert(productPayload)
                .select("id")
                .single();
              productId = newProduct!.id;
              results.products++;
            }
          } else {
            const { data: newProduct } = await supabase
              .from("products")
              .insert(productPayload)
              .select("id")
              .single();
            productId = newProduct!.id;
            results.products++;
          }

          // Upsert offer
          const offerPayload = {
            user_id,
            product_id: productId,
            name: item.offer_name || item.name || "Oferta Logzz",
            price: item.price || 0,
            original_price: item.original_price || null,
            hash: item.offer_hash || item.hash || null,
            checkout_type: "hybrid",
            is_active: true,
            expedition_checkout_url: item.expedition_checkout_url || null,
            scheduling_checkout_url: item.scheduling_checkout_url || null,
          };

          const offerHash = item.offer_hash || item.hash;
          if (offerHash) {
            const { data: existingOffer } = await supabase
              .from("offers")
              .select("id")
              .eq("user_id", user_id)
              .eq("hash", offerHash)
              .maybeSingle();

            if (existingOffer) {
              await supabase.from("offers").update(offerPayload).eq("id", existingOffer.id);
            } else {
              await supabase.from("offers").insert(offerPayload);
              results.offers++;
            }
          } else {
            await supabase.from("offers").insert(offerPayload);
            results.offers++;
          }

          results.synced++;
        }

        return new Response(
          JSON.stringify({ success: true, ...results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── ACTION: test_logzz_connection ────────────────
    if (action === "test_connection") {
      const logzz = getIntegration("logzz");
      if (!logzz?.config) {
        return new Response(
          JSON.stringify({ connected: false, error: "Logzz não configurado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = (logzz.config as any).bearer_token;
      try {
        const res = await fetch("https://app.logzz.com.br/api/offers", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const rawTest = await res.text();
        let data: any;
        try { data = JSON.parse(rawTest); } catch {
          return new Response(
            JSON.stringify({ connected: false, error: `Logzz retornou resposta inválida. Token pode estar inválido.` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ connected: res.ok, offers_count: Array.isArray(data.data) ? data.data.length : 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ connected: false, error: e.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
