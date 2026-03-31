import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

async function sendViaProvider(
  instance: any,
  phone: string,
  message: string,
  isTemplate: boolean,
  flowData: any | null
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, "");

  // ====== META (Template or Text) ======
  if (instance.provider === "meta") {
    const accessToken = instance.meta_access_token;
    const phoneNumberId = instance.phone_number_id;
    if (!accessToken || !phoneNumberId) return { success: false, error: "Meta não configurada" };

    try {
      let payload: any;

      if (isTemplate && flowData) {
        // Send official template
        const templateName = flowData.template_name || flowData.name?.toLowerCase().replace(/\s+/g, "_") || "hello_world";
        payload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: flowData.language || "pt_BR" },
            components: flowData.components || [],
          },
        };
      } else {
        payload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message },
        };
      }

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (res.ok && data.messages?.[0]?.id) {
        return { success: true, messageId: data.messages[0].id };
      }
      return { success: false, error: data.error?.message || `Meta error: ${res.status}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ====== YCLOUD ======
  if (instance.provider === "ycloud") {
    const apiKey = instance.ycloud_api_key;
    if (!apiKey) return { success: false, error: "YCloud API key não configurada" };

    try {
      let payload: any;

      if (isTemplate && flowData) {
        const templateName = flowData.template_name || flowData.name?.toLowerCase().replace(/\s+/g, "_") || "hello_world";
        payload = {
          from: instance.phone_number,
          to: `+${cleanPhone}`,
          type: "template",
          template: {
            name: templateName,
            language: { code: flowData.language || "pt_BR" },
            components: flowData.components || [],
          },
        };
      } else {
        payload = {
          from: instance.phone_number,
          to: `+${cleanPhone}`,
          type: "text",
          text: { body: message },
        };
      }

      const res = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        return { success: true, messageId: data.id };
      }
      return { success: false, error: data.message || `YCloud error: ${res.status}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ====== EVOLUTION ======
  if (instance.provider === "evolution") {
    const serverUrl = instance.evolution_server_url;
    const apiKey = instance.api_key;
    const instanceName = instance.instance_name;
    if (!serverUrl || !apiKey || !instanceName) return { success: false, error: "Evolution não configurada" };

    try {
      const res = await fetch(
        `${serverUrl.replace(/\/$/, "")}/message/sendText/${instanceName}`,
        {
          method: "POST",
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            number: `${cleanPhone}@s.whatsapp.net`,
            text: message,
            delay: 1200,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        return { success: true, messageId: data.key?.id || data.id || undefined };
      }
      return { success: false, error: data.message || `Evolution error: ${res.status}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  return { success: false, error: "Provider desconhecido" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "campaignId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth: check via header or allow service-role (for cron)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader && !authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(0, 20))) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
    }

    // Fetch campaign
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campanha não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user-authenticated, verify ownership
    if (userId && campaign.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent re-running completed campaigns
    if (campaign.status === "completed" || campaign.status === "running") {
      return new Response(
        JSON.stringify({ error: "Campanha já executada ou em execução" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as running
    await supabase.from("campaigns").update({
      status: "running",
      started_at: new Date().toISOString(),
    }).eq("id", campaignId);

    // Fetch flow and template if linked
    let flowData: any = null;
    let isTemplate = false;
    if (campaign.flow_id) {
      const { data: flow } = await supabase
        .from("flows")
        .select("*")
        .eq("id", campaign.flow_id)
        .single();

      if (flow) {
        // Check for approved template
        const { data: template } = await supabase
          .from("flow_templates")
          .select("*")
          .eq("flow_id", flow.id)
          .eq("status", "approved")
          .limit(1)
          .maybeSingle();

        if (template) {
          flowData = template;
          isTemplate = true;
        } else {
          flowData = flow;
        }
      }
    }

    // Build message template
    const messageTemplate = campaign.message_template || flowData?.description || "Olá {{nome}}! Confira nossas novidades.";

    // Build leads query with segmentation
    const segmentFilter = (campaign as any).segment_filter || {};
    let leadsQuery = supabase
      .from("leads")
      .select("id, name, phone, email, status, tags")
      .eq("user_id", campaign.user_id)
      .not("phone", "is", null);

    if (segmentFilter.status) {
      leadsQuery = leadsQuery.eq("status", segmentFilter.status);
    }
    if (segmentFilter.tag) {
      leadsQuery = leadsQuery.contains("tags", [segmentFilter.tag]);
    }

    const { data: leads, error: leadsErr } = await leadsQuery;

    if (leadsErr || !leads || leads.length === 0) {
      await supabase.from("campaigns").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_recipients: 0,
        sent_count: 0,
        failed_count: 0,
      }).eq("id", campaignId);

      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: "Nenhum lead encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update total recipients
    await supabase.from("campaigns").update({
      total_recipients: leads.length,
    }).eq("id", campaignId);

    // Get connected WhatsApp instance
    // Prefer meta/ycloud for official templates, fallback to any connected
    let instanceQuery = supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", campaign.user_id)
      .eq("status", "connected")
      .order("created_at", { ascending: false })
      .limit(1);

    if (isTemplate) {
      // Prefer official providers for templates
      const { data: officialInstance } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("user_id", campaign.user_id)
        .eq("status", "connected")
        .in("provider", ["meta", "ycloud"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (officialInstance) {
        var instance: any = officialInstance;
      } else {
        const { data: anyInstance } = await instanceQuery.maybeSingle();
        var instance: any = anyInstance;
      }
    } else {
      const { data: anyInstance } = await instanceQuery.maybeSingle();
      var instance: any = anyInstance;
    }

    if (!instance) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      return new Response(
        JSON.stringify({ error: "Nenhuma instância WhatsApp conectada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process in batches of 5
    let sentCount = 0;
    let failedCount = 0;
    const batches = chunk(leads, 5);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (lead) => {
          const personalizedMsg = messageTemplate
            .replace(/\{\{nome\}\}/gi, lead.name || "Cliente")
            .replace(/\{\{telefone\}\}/gi, lead.phone || "")
            .replace(/\{\{email\}\}/gi, lead.email || "")
            .replace(/\{\{status\}\}/gi, lead.status || "");

          const result = await sendViaProvider(
            instance,
            lead.phone,
            personalizedMsg,
            isTemplate,
            flowData
          );

          return result;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      }

      // Update progress in real-time
      await supabase.from("campaigns").update({
        sent_count: sentCount,
        failed_count: failedCount,
      }).eq("id", campaignId);

      // Rate limiting: ~1.2s between batches
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    // Mark completed
    await supabase.from("campaigns").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
    }).eq("id", campaignId);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount, total: leads.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[execute-campaign] Error:", e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
