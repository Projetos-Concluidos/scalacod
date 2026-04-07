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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS and resolve effective user (team context)
    const adminClient = createClient(supabaseUrl, serviceKey);
    
    // Resolve effective user id (owner if team member)
    const { data: teamMember } = await adminClient
      .from("team_members")
      .select("owner_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    const effectiveUserId = teamMember?.owner_id || user.id;

    // Get Hyppe integration
    const { data: integration } = await adminClient
      .from("integrations")
      .select("*")
      .eq("user_id", effectiveUserId)
      .eq("type", "hyppe")
      .eq("is_active", true)
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ error: "Integração Hyppe não configurada", offers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = integration.config as any;
    const apiToken = config?.api_token;
    if (!apiToken) {
      return new Response(JSON.stringify({ error: "API Token da Hyppe não configurado", offers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch products from Hyppe API
    const res = await fetch("https://app.hyppe.com.br/api/produtos?limite=100", {
      headers: {
        Authorization: apiToken,
        Accept: "application/json",
      },
      redirect: "manual",
    });

    const ct = res.headers.get("content-type") || "";
    if (res.status >= 300 && res.status < 400) {
      return new Response(JSON.stringify({ error: "Hyppe API redirecionou — token pode estar inválido", offers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ct.includes("application/json")) {
      const raw = await res.text();
      console.error("[hyppe-list-products] Non-JSON:", raw.substring(0, 300));
      return new Response(JSON.stringify({ error: "Resposta não-JSON da Hyppe", offers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `Hyppe API error ${res.status}: ${errText.slice(0, 200)}`, offers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const products = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    // For each product, fetch its detailed info (offers, variations)
    const offers: any[] = [];
    for (const prod of products) {
      try {
        const detailRes = await fetch("https://app.hyppe.com.br/api/checkout/produto", {
          method: "POST",
          headers: {
            Authorization: apiToken,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ produto_id: prod.id }),
          redirect: "manual",
        });
        
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const productOffers = detail?.ofertas || [];
          for (const oferta of productOffers) {
            offers.push({
              hyppe_product_id: prod.id,
              product_name: prod.nome || detail?.nome || "Produto Hyppe",
              product_description: detail?.descricao || null,
              offer_name: oferta?.nome || `Oferta ${oferta?.id}`,
              hyppe_offer_id: oferta?.id,
              price: oferta?.valor_venda || 0,
              original_price: oferta?.valor_venda || 0,
              quantity: oferta?.quantidade || 1,
              commission_percent: oferta?.percentual_comissao || 0,
              source: "hyppe",
            });
          }
          // If no offers found, create a default entry
          if (productOffers.length === 0) {
            offers.push({
              hyppe_product_id: prod.id,
              product_name: prod.nome || "Produto Hyppe",
              product_description: null,
              offer_name: prod.nome || "Oferta Padrão",
              hyppe_offer_id: null,
              price: 0,
              original_price: 0,
              quantity: 1,
              commission_percent: 0,
              source: "hyppe",
            });
          }
        }
      } catch (err) {
        console.warn("[hyppe-list-products] Error fetching detail for product:", prod.id, err);
        offers.push({
          hyppe_product_id: prod.id,
          product_name: prod.nome || "Produto Hyppe",
          product_description: null,
          offer_name: prod.nome || "Oferta Padrão",
          hyppe_offer_id: null,
          price: prod.estoque_atual || 0,
          original_price: 0,
          quantity: 1,
          commission_percent: 0,
          source: "hyppe",
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      offers,
      total: offers.length,
      message: `${offers.length} oferta(s) encontrada(s) na Hyppe`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[hyppe-list-products] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message, offers: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
