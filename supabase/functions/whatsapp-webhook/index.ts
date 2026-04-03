import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function findOrCreateConversation(
  supabase: any,
  userId: string,
  phone: string,
  instanceId: string | null
) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("contact_phone", phone)
    .maybeSingle();

  if (existing) return existing;

  // Look up lead by phone
  const { data: lead } = await supabase
    .from("leads")
    .select("id, name")
    .eq("user_id", userId)
    .eq("phone", phone)
    .maybeSingle();

  const { data: newConv } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      lead_id: lead?.id || null,
      contact_phone: phone,
      contact_name: lead?.name || phone,
      whatsapp_instance: instanceId,
      status: "open",
      unread_count: 1,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  return newConv;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Rate limit: 200 requests per 60 seconds
  if (req.method === "POST") {
    const { limited } = await checkRateLimit(req, {
      action: "whatsapp-webhook",
      windowSeconds: 60,
      maxAttempts: 200,
    });
    if (limited) return rateLimitResponse(corsHeaders, 60);
  }

  const provider = url.searchParams.get("provider");
  const storeId = url.searchParams.get("store") || url.searchParams.get("user_id");

  if (!provider || !storeId) {
    return new Response(
      JSON.stringify({ error: "Missing provider or store params" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ====== META WEBHOOK VERIFICATION (GET) ======
    if (provider === "meta" && req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "scalacod_verify";
      if (mode === "subscribe" && token === verifyToken) {
        return new Response(challenge || "", { status: 200, headers: corsHeaders });
      }
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const payload = await req.json();

    // ====== YCLOUD ======
    if (provider === "ycloud") {
      if (payload.type === "whatsapp.message.received") {
        const msg = payload.whatsappMessage;
        if (!msg) {
          return new Response("ok", { headers: corsHeaders });
        }

        const phone = (msg.from || "").replace("@c.us", "").replace("+", "");
        const conversation = await findOrCreateConversation(supabase, storeId, phone, msg.wabaId || null);

        if (!conversation) {
          console.error("[ycloud] Failed to find/create conversation");
          return new Response("ok", { headers: corsHeaders });
        }

        const msgContent = msg.text?.body || null;
        const mediaUrl = msg.image?.url || msg.audio?.url || msg.document?.url || msg.video?.url || null;
        const msgType = msg.type === "TEXT" ? "text" : (msg.type || "text").toLowerCase();

        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          message_id_whatsapp: msg.id,
          direction: "inbound",
          type: msgType,
          content: msgContent,
          media_url: mediaUrl,
          status: "delivered",
          timestamp: msg.createTime ? new Date(msg.createTime).toISOString() : new Date().toISOString(),
        });

        await supabase
          .from("conversations")
          .update({
            last_message: msgContent || "[mídia]",
            last_message_at: new Date().toISOString(),
            unread_count: (conversation.unread_count || 0) + 1,
          })
          .eq("id", conversation.id);
      }

      // Status updates from YCloud
      if (payload.type === "whatsapp.message.updated") {
        const msg = payload.whatsappMessage;
        if (msg?.id && msg?.status) {
          const statusMap: Record<string, string> = {
            sent: "sent",
            delivered: "delivered",
            read: "read",
            failed: "failed",
          };
          await supabase
            .from("messages")
            .update({ status: statusMap[msg.status] || msg.status })
            .eq("message_id_whatsapp", msg.id);
        }
      }
    }

    // ====== META ======
    if (provider === "meta" && req.method === "POST") {
      const entries = payload.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== "messages") continue;

          const value = change.value || {};
          const metadata = value.metadata || {};
          const inboundMessages = value.messages || [];
          const statuses = value.statuses || [];

          for (const msg of inboundMessages) {
            const phone = msg.from;
            const conversation = await findOrCreateConversation(
              supabase,
              storeId,
              phone,
              metadata.phone_number_id || null
            );

            if (!conversation) continue;

            const msgContent = msg.text?.body || null;
            const mediaUrl = msg.image?.id || msg.audio?.id || msg.document?.id || msg.video?.id
              ? `meta_media:${msg.image?.id || msg.audio?.id || msg.document?.id || msg.video?.id}`
              : null;

            await supabase.from("messages").insert({
              conversation_id: conversation.id,
              message_id_whatsapp: msg.id,
              direction: "inbound",
              type: msg.type || "text",
              content: msgContent,
              media_url: mediaUrl,
              status: "delivered",
              timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            });

            await supabase
              .from("conversations")
              .update({
                last_message: msgContent || "[mídia]",
                last_message_at: new Date().toISOString(),
                unread_count: (conversation.unread_count || 0) + 1,
              })
              .eq("id", conversation.id);
          }

          for (const status of statuses) {
            if (status.id) {
              const statusMap: Record<string, string> = {
                sent: "sent",
                delivered: "delivered",
                read: "read",
                failed: "failed",
              };
              await supabase
                .from("messages")
                .update({ status: statusMap[status.status] || status.status })
                .eq("message_id_whatsapp", status.id);
            }
          }
        }
      }
    }

    // ====== EVOLUTION ======
    if (provider === "evolution") {
      // Inbound messages
      if (payload.event === "messages.upsert") {
        const msgs = payload.data || [];
        for (const msg of msgs) {
          if (msg.key?.fromMe) continue;

          const phone = (msg.key?.remoteJid || "").replace("@s.whatsapp.net", "").replace("@c.us", "");
          if (!phone) continue;

          const conversation = await findOrCreateConversation(supabase, storeId, phone, null);
          if (!conversation) continue;

          const content =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            null;

          const mediaUrl =
            msg.message?.imageMessage?.url ||
            msg.message?.audioMessage?.url ||
            msg.message?.documentMessage?.url ||
            msg.message?.videoMessage?.url ||
            null;

          const msgType = content ? "text" : mediaUrl ? "media" : "text";

          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            message_id_whatsapp: msg.key?.id || null,
            direction: "inbound",
            type: msgType,
            content: content || (mediaUrl ? "[mídia]" : null),
            media_url: mediaUrl,
            status: "delivered",
            timestamp: msg.messageTimestamp
              ? new Date(parseInt(msg.messageTimestamp) * 1000).toISOString()
              : new Date().toISOString(),
          });

          await supabase
            .from("conversations")
            .update({
              last_message: content || "[mídia]",
              last_message_at: new Date().toISOString(),
              unread_count: (conversation.unread_count || 0) + 1,
            })
            .eq("id", conversation.id);
        }
      }

      // Connection status updates
      if (payload.event === "connection.update") {
        const stateMap: Record<string, string> = {
          open: "connected",
          close: "disconnected",
          connecting: "connecting",
        };
        const newStatus = stateMap[payload.data?.state] || "disconnected";
        await supabase
          .from("whatsapp_instances")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("user_id", storeId)
          .eq("provider", "evolution");
      }

      // QR Code update
      if (payload.event === "qrcode.updated") {
        const qrCode = payload.data?.qrcode?.base64 || payload.data?.qrcode || null;
        if (qrCode) {
          await supabase
            .from("whatsapp_instances")
            .update({ qr_code: qrCode, updated_at: new Date().toISOString() })
            .eq("user_id", storeId)
            .eq("provider", "evolution");
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[whatsapp-webhook] Error (${provider}):`, e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
