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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationId, flowId, variables } = await req.json();

    if (!conversationId || !flowId) {
      return new Response(JSON.stringify({ error: "conversationId and flowId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch flow with template
    const { data: flow, error: flowErr } = await supabase
      .from("flows")
      .select("*, flow_templates(*)")
      .eq("id", flowId)
      .eq("user_id", user.id)
      .single();

    if (flowErr || !flow) {
      return new Response(JSON.stringify({ error: "Fluxo não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templates = flow.flow_templates as any[];
    const template = templates?.find((t: any) => t.status === "APPROVED") || templates?.[0];

    if (!template) {
      return new Response(JSON.stringify({ error: "Nenhum template encontrado para este fluxo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!conv) {
      return new Response(JSON.stringify({ error: "Conversa não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch connected Meta or YCloud instance
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user.id)
      .in("provider", ["meta", "ycloud"])
      .eq("status", "connected");

    const instance = instances?.[0];
    if (!instance) {
      return new Response(
        JSON.stringify({ error: "Nenhuma instância Meta/YCloud conectada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = conv.contact_phone.replace(/\D/g, "");
    let messageIdWhatsapp: string | null = null;
    let sendError: string | null = null;

    // Build template components with variables
    const templateComponents: any[] = [];
    const vars = variables || [];

    if (vars.length > 0) {
      templateComponents.push({
        type: "body",
        parameters: vars.map((v: string) => ({ type: "text", text: v })),
      });
    }

    // Send via Meta
    if (instance.provider === "meta") {
      const accessToken = instance.meta_access_token;
      const phoneNumberId = instance.phone_number_id;

      if (!accessToken || !phoneNumberId) {
        return new Response(
          JSON.stringify({ error: "Meta access token ou phone_number_id não configurados" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const payload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "template",
          template: {
            name: template.template_name,
            language: { code: template.language || "pt_BR" },
            components: templateComponents.length > 0 ? templateComponents : undefined,
          },
        };

        const res = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();
        if (res.ok && data.messages?.[0]?.id) {
          messageIdWhatsapp = data.messages[0].id;
        } else {
          sendError = data.error?.message || `Meta API error: ${res.status}`;
        }
      } catch (e) {
        sendError = `Meta: ${e.message}`;
      }
    }

    // Send via YCloud
    if (instance.provider === "ycloud") {
      const apiKey = instance.ycloud_api_key;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "YCloud API key não configurada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const payload = {
          from: instance.phone_number,
          to: `+${cleanPhone}`,
          type: "template",
          template: {
            name: template.template_name,
            language: { code: template.language || "pt_BR" },
            components: templateComponents.length > 0 ? templateComponents : undefined,
          },
        };

        const res = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
          method: "POST",
          headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.id) {
          messageIdWhatsapp = data.id;
        } else {
          sendError = data.message || data.error || `YCloud error: ${res.status}`;
        }
      } catch (e) {
        sendError = `YCloud: ${e.message}`;
      }
    }

    if (sendError) {
      return new Response(JSON.stringify({ error: sendError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save outbound message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      message_id_whatsapp: messageIdWhatsapp,
      direction: "outbound",
      type: "template",
      content: `[Template: ${flow.name}] ${template.template_name}`,
      status: "sent",
      timestamp: new Date().toISOString(),
    });

    await supabase
      .from("conversations")
      .update({
        last_message: `[Template: ${flow.name}]`,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ success: true, message_id: messageIdWhatsapp, provider: instance.provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-template-message] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
