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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { conversationId, content, type = "text", mediaUrl, phone, direct, userId: bodyUserId } = body;

    // Determine user: try auth.getUser first (client calls), fallback to bodyUserId (service-to-service)
    let userId: string | null = null;
    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (token === serviceRoleKey && bodyUserId) {
      // Service-to-service call (from execute-flow, execute-campaign, etc.)
      userId = bodyUserId;
      console.log("[send-whatsapp-message] Service-role call for userId:", userId);
    } else {
      // Client call — validate JWT
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "No user identified" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For media messages, content can be empty but mediaUrl is required
    if (type === "text" && !content?.trim()) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type !== "text" && !mediaUrl) {
      return new Response(
        JSON.stringify({ error: "mediaUrl is required for media messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active WhatsApp instance
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!instance) {
      console.warn("[send-whatsapp-message] No connected instance for user:", userId);
      return new Response(
        JSON.stringify({ error: "Nenhuma instância WhatsApp conectada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-whatsapp-message] Sending via ${instance.provider} to ${phone || "conversation"}`);

    // Determine target phone
    let targetPhone = phone;
    let convId = conversationId;

    if (!direct && conversationId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", userId)
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

    // Format phone: ensure Brazilian numbers have 55 prefix
    let cleanPhone = targetPhone.replace(/\D/g, "");
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    }
    console.log(`[send-whatsapp-message] Formatted phone: ${targetPhone} → ${cleanPhone}`);

    let messageIdWhatsapp: string | null = null;
    let sendError: string | null = null;

    // Build provider-specific payload based on message type
    const msgType = type || "text";

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
        let payload: any = {
          from: instance.phone_number,
          to: `+${cleanPhone}`,
        };

        if (msgType === "text") {
          payload.type = "text";
          payload.text = { body: content };
        } else if (msgType === "image") {
          payload.type = "image";
          payload.image = { link: mediaUrl, caption: content || undefined };
        } else if (msgType === "audio") {
          payload.type = "audio";
          payload.audio = { link: mediaUrl };
        } else if (msgType === "document") {
          payload.type = "document";
          payload.document = { link: mediaUrl, caption: content || undefined, filename: "document" };
        } else if (msgType === "video") {
          payload.type = "video";
          payload.video = { link: mediaUrl, caption: content || undefined };
        } else if (msgType === "sticker") {
          payload.type = "sticker";
          payload.sticker = { link: mediaUrl };
        }

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
        let payload: any = {
          messaging_product: "whatsapp",
          to: cleanPhone,
        };

        if (msgType === "text") {
          payload.type = "text";
          payload.text = { body: content };
        } else if (msgType === "image") {
          payload.type = "image";
          payload.image = { link: mediaUrl, caption: content || undefined };
        } else if (msgType === "audio") {
          payload.type = "audio";
          payload.audio = { link: mediaUrl };
        } else if (msgType === "document") {
          payload.type = "document";
          payload.document = { link: mediaUrl, caption: content || undefined, filename: "document" };
        } else if (msgType === "video") {
          payload.type = "video";
          payload.video = { link: mediaUrl, caption: content || undefined };
        } else if (msgType === "sticker") {
          payload.type = "sticker";
          payload.sticker = { link: mediaUrl };
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
      let serverUrl = instance.evolution_server_url;
      let apiKey = instance.api_key;
      const instanceName = instance.instance_name;

      // Fallback to global credentials if instance-specific ones are missing
      if (!serverUrl || !apiKey) {
        console.log("[send-whatsapp-message] Instance credentials missing, trying global system_config...");
        const { data: configs } = await supabase
          .from("system_config")
          .select("key, value")
          .in("key", ["integration_evolution_url", "integration_evolution_api_key"]);

        if (configs) {
          const cleanStr = (v: any): string => {
            if (typeof v === "string") return v.replace(/^"|"$/g, "").trim();
            return String(v ?? "").replace(/^"|"$/g, "").trim();
          };
          if (!serverUrl) serverUrl = cleanStr(configs.find((c: any) => c.key === "integration_evolution_url")?.value).replace(/\/$/, "");
          if (!apiKey) apiKey = cleanStr(configs.find((c: any) => c.key === "integration_evolution_api_key")?.value);
        }
      }

      if (!serverUrl || !apiKey || !instanceName) {
        return new Response(
          JSON.stringify({ error: "Evolution API não configurada completamente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const baseUrl = serverUrl.replace(/\/$/, "");
        const number = `${cleanPhone}@s.whatsapp.net`;
        let endpoint = "sendText";
        let bodyPayload: any = { number, text: content, delay: 1200 };

        if (msgType === "image") {
          endpoint = "sendMedia";
          bodyPayload = { number, mediatype: "image", media: mediaUrl, caption: content || "", delay: 1200 };
        } else if (msgType === "audio") {
          endpoint = "sendWhatsAppAudio";
          bodyPayload = { number, audio: mediaUrl, delay: 1200 };
        } else if (msgType === "document") {
          endpoint = "sendMedia";
          bodyPayload = { number, mediatype: "document", media: mediaUrl, caption: content || "", fileName: "document", delay: 1200 };
        } else if (msgType === "video") {
          endpoint = "sendMedia";
          bodyPayload = { number, mediatype: "video", media: mediaUrl, caption: content || "", delay: 1200 };
        } else if (msgType === "sticker") {
          endpoint = "sendSticker";
          bodyPayload = { number, sticker: mediaUrl, delay: 1200 };
        }

        const res = await fetch(`${baseUrl}/message/${endpoint}/${instanceName}`, {
          method: "POST",
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });

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
      console.error("[send-whatsapp-message] Send error:", sendError);
      return new Response(
        JSON.stringify({ error: sendError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-whatsapp-message] Success via ${instance.provider}, msgId: ${messageIdWhatsapp}`);

    // Save outbound message to DB
    if (convId) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        message_id_whatsapp: messageIdWhatsapp,
        direction: "outbound",
        type: msgType,
        content: content || (mediaUrl ? `[${msgType}]` : null),
        media_url: mediaUrl || null,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      await supabase
        .from("conversations")
        .update({
          last_message: content || `[${msgType}]`,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convId);
    }

    return new Response(
      JSON.stringify({ success: true, message_id: messageIdWhatsapp, provider: instance.provider }),
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
