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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { conversationId, content, type = "text", mediaUrl, phone, direct } = body;

    if (!content?.trim()) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active WhatsApp instance
    const { data: instance, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "connected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!instance) {
      return new Response(
        JSON.stringify({ error: "Nenhuma instância WhatsApp conectada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine target phone
    let targetPhone = phone;
    let convId = conversationId;

    if (!direct && conversationId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .single();

      if (!conv) {
        return new Response(
          JSON.stringify({ error: "Conversa não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetPhone = conv.contact_phone;
    }

    if (!targetPhone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number
    const cleanPhone = targetPhone.replace(/\D/g, "");
    let messageIdWhatsapp: string | null = null;
    let sendError: string | null = null;

    // ====== YCLOUD ======
    if (instance.provider === "ycloud") {
      const apiKey = instance.ycloud_api_key;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "YCloud API key não configurada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const payload: any = {
          from: instance.phone_number,
          to: `+${cleanPhone}`,
          type: "text",
          text: { body: content },
        };

        const res = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
            "Content-Type": "application/json",
          },
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

    // ====== META ======
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
        const payload: any = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: content },
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

    // ====== EVOLUTION ======
    if (instance.provider === "evolution") {
      const serverUrl = instance.evolution_server_url;
      const apiKey = instance.api_key;
      const instanceName = instance.instance_name;

      if (!serverUrl || !apiKey || !instanceName) {
        return new Response(
          JSON.stringify({ error: "Evolution API não configurada completamente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const res = await fetch(
          `${serverUrl.replace(/\/$/, "")}/message/sendText/${instanceName}`,
          {
            method: "POST",
            headers: {
              apikey: apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              number: `${cleanPhone}@s.whatsapp.net`,
              text: content,
              delay: 1200,
            }),
          }
        );

        const data = await res.json();
        if (res.ok) {
          messageIdWhatsapp = data.key?.id || data.id || null;
        } else {
          sendError = data.message || data.error || `Evolution error: ${res.status}`;
        }
      } catch (e) {
        sendError = `Evolution: ${e.message}`;
      }
    }

    if (sendError) {
      return new Response(
        JSON.stringify({ error: sendError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save outbound message to DB (only for conversation-based sends)
    if (convId) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        message_id_whatsapp: messageIdWhatsapp,
        direction: "outbound",
        type: type,
        content: content,
        media_url: mediaUrl || null,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      await supabase
        .from("conversations")
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageIdWhatsapp,
        provider: instance.provider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-whatsapp-message] Error:", e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
