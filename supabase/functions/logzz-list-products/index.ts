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

    // Authenticate user via JWT
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

    // Get Logzz integration config
    const { data: integrations } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "logzz");

    const logzz = integrations?.[0];
    const logzzToken = (logzz?.config as any)?.bearer_token;

    if (!logzzToken) {
      // Return empty silently (as per spec: if logzz_api_token not configured, return empty)
      return new Response(
        JSON.stringify({ success: true, offers: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Logzz API
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

    // Extract offers from role-based structure: { type, status, data: { producer: [...], affiliate: [...], coproducer: [...] } }
    const actualData = data?.data || data;
    const roles = ["producer", "affiliate", "coproducer"];
    const offers: any[] = [];

    for (const role of roles) {
      const products = actualData?.[role];
      if (!Array.isArray(products)) continue;

      for (const product of products) {
        const productName = product.name || "Produto Logzz";
        const productHash = product.hash || null;
        const productOffers = product.offers;

        if (Array.isArray(productOffers)) {
          for (const offer of productOffers) {
            offers.push({
              product_name: productName,
              product_hash: productHash,
              offer_name: offer.name || productName,
              offer_hash: offer.hash || null,
              price: parseFloat(offer.price || "0"),
              role,
            });
          }
        } else {
          // Product without nested offers — treat product itself as an offer
          offers.push({
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

    // Also try flat array/object shapes as fallback
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
          offer_name: item.offer_name || item.name || "Oferta",
          offer_hash: item.offer_hash || item.hash || null,
          price: parseFloat(item.price || "0"),
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
