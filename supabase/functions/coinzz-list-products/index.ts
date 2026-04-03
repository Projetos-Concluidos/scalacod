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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token JWT ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: integrations } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "coinzz");

    const coinzz = integrations?.[0];
    const coinzzToken = (coinzz?.config as any)?.bearer_token || (coinzz?.config as any)?.api_token || (coinzz?.config as any)?.access_token;

    if (!coinzzToken) {
      return new Response(
        JSON.stringify({ success: true, offers: [], message: "Token da Coinzz não configurado. Vá em Configurações → Coinzz." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try multiple possible endpoints including the v1 pattern that works for Logzz
    const endpoints = [
      "https://app.coinzz.com.br/api/v1/products",
      "https://app.coinzz.com.br/api/products",
      "https://app.coinzz.com.br/api/v1/my-products",
      "https://app.coinzz.com.br/api/v1/user/products",
      "https://app.coinzz.com.br/api/v1/sales",
      "https://app.coinzz.com.br/api/sales",
    ];

    let res: Response | null = null;
    let usedEndpoint = "";

    for (const endpoint of endpoints) {
      console.log(`[coinzz-list-products] Trying: ${endpoint}`);
      const attempt = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${coinzzToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        redirect: "manual",
      });
      const ct = attempt.headers.get("content-type") || "";
      const st = attempt.status;
      const body = await attempt.text();
      console.log(`[coinzz-list-products] ${endpoint} → status=${st}, ct=${ct.substring(0, 50)}, body=${body.substring(0, 200)}`);
      
      if (ct.includes("json") && st >= 200 && st < 300) {
        // Re-parse as we consumed body
        res = new Response(body, { status: st, headers: attempt.headers });
        usedEndpoint = endpoint;
        break;
      }
    }

    if (!res) {
      return new Response(
        JSON.stringify({ success: true, offers: [], message: "Nenhum endpoint da Coinzz retornou dados válidos. O token pode estar expirado ou a API não expõe listagem de produtos. Configure as ofertas manualmente." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[coinzz-list-products] Success with: ${usedEndpoint}`);

    const status = res.status;
    console.log(`[coinzz-list-products] Status: ${status}`);

    if (status >= 300 && status < 400) {
      return new Response(
        JSON.stringify({ success: true, offers: [], message: "Coinzz redirecionou (token pode estar expirado)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status !== 200) {
      return new Response(
        JSON.stringify({ success: true, offers: [], message: `Coinzz retornou status ${status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      const preview = await res.text();
      console.log(`[coinzz-list-products] Non-JSON: ${preview.substring(0, 200)}`);
      return new Response(
        JSON.stringify({ success: true, offers: [], message: "Coinzz retornou HTML. Token pode estar expirado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    console.log(`[coinzz-list-products] Response type: ${typeof data}, keys: ${Object.keys(data || {}).join(",")}`);
    console.log(`[coinzz-list-products] Preview: ${JSON.stringify(data).substring(0, 500)}`);

    const actualData = data?.data || data;
    const roles = ["producer", "affiliate", "coproducer"];
    const offers: any[] = [];

    for (const role of roles) {
      const products = actualData?.[role];
      if (!Array.isArray(products)) continue;

      for (const product of products) {
        const productName = product.name || "Produto Coinzz";
        const productHash = product.hash || null;
        const productDescription = product.description || null;
        const productImageUrl = product.main_image_url || product.image_url || product.image || null;
        const specs = product.specifications || product;
        const productWeight = specs?.weight ?? null;
        const productWidth = specs?.width ?? null;
        const productHeight = specs?.height ?? null;
        const productLength = specs?.length ?? null;
        const productWarrantyDays = product.warranty_time ?? product.warranty_days ?? null;
        const productCategories = product.categories || [];
        const productOffers = product.offers;

        if (Array.isArray(productOffers)) {
          for (const offer of productOffers) {
            offers.push({
              product_name: productName,
              product_hash: productHash,
              product_description: productDescription,
              product_image_url: productImageUrl,
              product_weight: productWeight,
              product_width: productWidth,
              product_height: productHeight,
              product_length: productLength,
              product_warranty_days: productWarrantyDays,
              product_categories: productCategories,
              offer_name: offer.name || productName,
              offer_hash: offer.hash || null,
              price: parseFloat(offer.price || "0"),
              original_price: parseFloat(offer.original_price || offer.price || "0"),
              role,
              platform: "coinzz",
            });
          }
        } else {
          offers.push({
            product_name: productName,
            product_hash: productHash,
            product_description: productDescription,
            product_image_url: productImageUrl,
            product_weight: productWeight,
            product_width: productWidth,
            product_height: productHeight,
            product_length: productLength,
            product_warranty_days: productWarrantyDays,
            product_categories: productCategories,
            offer_name: productName,
            offer_hash: productHash,
            price: parseFloat(product.price || "0"),
            original_price: parseFloat(product.original_price || product.price || "0"),
            role,
            platform: "coinzz",
          });
        }
      }
    }

    // Flat array fallback
    if (offers.length === 0) {
      let items: any[] = [];
      if (Array.isArray(data)) items = data;
      else if (Array.isArray(data?.data)) items = data.data;
      else if (Array.isArray(data?.offers)) items = data.offers;
      else if (Array.isArray(data?.products)) items = data.products;

      for (const item of items) {
        offers.push({
          product_name: item.product_name || item.name || "Produto",
          product_hash: item.product_hash || item.hash || null,
          product_description: item.description || null,
          product_image_url: item.main_image_url || item.image_url || null,
          product_weight: item.weight ?? null,
          product_width: item.width ?? null,
          product_height: item.height ?? null,
          product_length: item.length ?? null,
          product_warranty_days: item.warranty_time ?? null,
          product_categories: item.categories || [],
          offer_name: item.offer_name || item.name || "Oferta",
          offer_hash: item.offer_hash || item.hash || null,
          price: parseFloat(item.price || "0"),
          original_price: parseFloat(item.original_price || item.price || "0"),
          role: item.role || "unknown",
          platform: "coinzz",
        });
      }
    }

    console.log(`[coinzz-list-products] Extracted ${offers.length} offers`);

    return new Response(
      JSON.stringify({ success: true, offers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(`[coinzz-list-products] Error: ${e.message}`);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
