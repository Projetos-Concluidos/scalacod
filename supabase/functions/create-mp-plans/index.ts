import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpAccessToken = Deno.env.get("MP_PLATFORM_ACCESS_TOKEN");
    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({ error: "MP_PLATFORM_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch plans from database
    const { data: plans, error: plansError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (plansError || !plans) {
      return new Response(JSON.stringify({ error: "Failed to fetch plans" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ slug: string; mp_plan_id: string | null; error?: string }> = [];

    for (const plan of plans) {
      // Skip if already has mp_plan_id
      if (plan.mp_plan_id) {
        results.push({ slug: plan.slug, mp_plan_id: plan.mp_plan_id });
        continue;
      }

      try {
        const mpPayload = {
          reason: `ScalaNinja ${plan.name}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: Number(plan.price_monthly),
            currency_id: "BRL",
          },
          back_url: "https://ninja-cod-flow.lovable.app/subscription",
        };

        const mpRes = await fetch("https://api.mercadopago.com/preapproval_plan", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mpPayload),
        });

        const mpData = await mpRes.json();

        if (!mpRes.ok) {
          results.push({
            slug: plan.slug,
            mp_plan_id: null,
            error: mpData.message || `HTTP ${mpRes.status}`,
          });
          continue;
        }

        // Save mp_plan_id back to database
        await supabaseAdmin
          .from("plans")
          .update({ mp_plan_id: mpData.id })
          .eq("id", plan.id);

        results.push({ slug: plan.slug, mp_plan_id: mpData.id });
      } catch (err) {
        results.push({
          slug: plan.slug,
          mp_plan_id: null,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
