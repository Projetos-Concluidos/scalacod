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
      .eq("type", "logzz");

    const logzz = integrations?.[0];
    const logzzToken = (logzz?.config as any)?.bearer_token;
    const configAffiliateId = (logzz?.config as any)?.affiliate_id || null;

    if (!logzzToken) {
      return new Response(
        JSON.stringify({ success: true, offers: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[logzz-list-products] Calling GET /api/v1/products");
    const res = await fetch("https://app.logzz.com.br/api/v1/products", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${logzzToken}`,
        Accept: "application/json",
      },
      redirect: "manual",
    });

    const status = res.status;
    console.log(`[logzz-list-products] Status: ${status}`);

    if (status >= 300 && status < 400) {
      return new Response(
        JSON.stringify({ success: true, offers: [], message: "Logzz redirecionou (token pode estar expirado)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status !== 200) {
      return new Response(
        JSON.stringify({ success: true, offers: [], message: `Logzz retornou status ${status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      const preview = await res.text();
      console.log(`[logzz-list-products] Non-JSON: ${preview.substring(0, 200)}`);
      return new Response(
        JSON.stringify({ success: true, offers: [], message: "Logzz retornou HTML. Token pode estar expirado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    console.log(`[logzz-list-products] Response type: ${typeof data}, keys: ${Object.keys(data || {}).join(",")}`);
    console.log(`[logzz-list-products] Preview: ${JSON.stringify(data).substring(0, 500)}`);

    const actualData = data?.data || data;
    const roles = ["producer", "affiliate", "coproducer"];
    const offers: any[] = [];

    let affiliateProductsLogged = 0;
    for (const role of roles) {
      const products = actualData?.[role];
      if (!Array.isArray(products)) continue;
      if (role === "affiliate") {
        console.log(`[logzz-list-products] Found ${products.length} affiliate products`);
      }

      for (const product of products) {
        // Log first 2 affiliate products with ALL fields for debugging
        if (role === "affiliate" && affiliateProductsLogged < 2) {
          affiliateProductsLogged++;
          const sanitized = { ...product, description: undefined };
          console.log(`[logzz-list-products] Affiliate product #${affiliateProductsLogged}: ${JSON.stringify(sanitized).substring(0, 800)}`);
        }
        const productName = product.name || "Produto Logzz";
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
            const schUrl = offer.scheduling_checkout_url || null;
            let affiliateCode: string | null = null;
            if (role === "affiliate") {
              // Try direct fields first
              affiliateCode = offer.affiliate_code || offer.affiliate_hash || product.affiliate_code || product.affiliate_hash || null;
              // Fallback: extract from scheduling_checkout_url
              if (!affiliateCode && schUrl) {
                const payMatch = schUrl.match(/\/pay\/([^/]+)\/[^/]+/);
                if (payMatch) affiliateCode = payMatch[1];
              }
              // Fallback: extract from expedition_checkout_url
              if (!affiliateCode) {
                const expUrl = offer.expedition_checkout_url || null;
                if (expUrl) {
                  const expMatch = expUrl.match(/\/pay\/([^/]+)\/[^/]+/);
                  if (expMatch) affiliateCode = expMatch[1];
                }
              }
              // Log first 3 affiliate offers for debugging
              if (offers.filter((o: any) => o.role === "affiliate").length < 3) {
                console.log(`[logzz-list-products] Affiliate offer: hash=${offer.hash}, schUrl=${schUrl}, expUrl=${offer.expedition_checkout_url}, affiliateCode=${affiliateCode}, keys=${Object.keys(offer).join(",")}`);
              }
            }
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
              scheduling_checkout_url: schUrl,
              expedition_checkout_url: offer.expedition_checkout_url || null,
              affiliate_code: affiliateCode,
              role,
            });
          }
        } else {
          const schUrl2 = product.scheduling_checkout_url || null;
          let affiliateCode2: string | null = null;
          if (role === "affiliate") {
            affiliateCode2 = product.affiliate_code || product.affiliate_hash || null;
            if (!affiliateCode2 && schUrl2) {
              const payMatch2 = schUrl2.match(/\/pay\/([^/]+)\/[^/]+/);
              if (payMatch2) affiliateCode2 = payMatch2[1];
            }
          }
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
            scheduling_checkout_url: schUrl2,
            expedition_checkout_url: null,
            affiliate_code: affiliateCode2,
            role,
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
          scheduling_checkout_url: item.scheduling_checkout_url || null,
          expedition_checkout_url: item.expedition_checkout_url || null,
          role: item.role || "unknown",
        });
      }
    }

    console.log(`[logzz-list-products] Extracted ${offers.length} offers`);

    return new Response(
      JSON.stringify({ success: true, offers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(`[logzz-list-products] Error: ${e.message}`);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
