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
    const { action, user_id, template_data, flow_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's Meta WhatsApp instance
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user_id)
      .eq("provider", "meta")
      .eq("status", "connected");

    const instance = instances?.[0];
    if (!instance?.meta_access_token || !instance?.waba_id) {
      return new Response(
        JSON.stringify({ error: "API Meta não conectada. Configure em WhatsApp Cloud > Facebook/Meta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: submit_template ──────────────────────
    if (action === "submit_template") {
      if (!template_data?.name || !template_data?.category || !template_data?.components) {
        return new Response(
          JSON.stringify({ error: "name, category and components are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${instance.waba_id}/message_templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${instance.meta_access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: template_data.name,
            language: template_data.language || "pt_BR",
            category: template_data.category,
            components: template_data.components,
          }),
        }
      );

      const data = await res.json();

      if (data.id) {
        // Save/update template in DB
        if (flow_id) {
          await supabase.from("flow_templates").upsert({
            flow_id,
            template_name: template_data.name,
            template_id_meta: data.id,
            category: template_data.category,
            language: template_data.language || "pt_BR",
            components: template_data.components,
            status: data.status || "PENDING",
          }, { onConflict: "flow_id,template_name" });
        }

        return new Response(
          JSON.stringify({ success: true, template_id: data.id, status: data.status || "PENDING" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: data.error?.message || "Erro ao submeter template", details: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: list_templates ───────────────────────
    if (action === "list_templates") {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${instance.waba_id}/message_templates?limit=100`,
        { headers: { Authorization: `Bearer ${instance.meta_access_token}` } }
      );
      const data = await res.json();

      return new Response(
        JSON.stringify({ templates: data.data || [] }),
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
