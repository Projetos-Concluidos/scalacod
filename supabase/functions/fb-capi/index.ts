import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashSHA256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { event, userData, customData, pixelId, capiToken, eventSourceUrl } = await req.json();

    if (!pixelId || !capiToken || !event) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userDataPayload: Record<string, any> = {
      client_ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      client_user_agent: req.headers.get("user-agent"),
    };

    if (userData?.email) userDataPayload.em = [await hashSHA256(userData.email.toLowerCase().trim())];
    if (userData?.phone) userDataPayload.ph = [await hashSHA256(userData.phone.replace(/\D/g, ""))];
    if (userData?.firstName) userDataPayload.fn = [await hashSHA256(userData.firstName.toLowerCase().trim())];
    if (userData?.lastName) userDataPayload.ln = [await hashSHA256(userData.lastName.toLowerCase().trim())];
    if (userData?.fbp) userDataPayload.fbp = userData.fbp;
    if (userData?.fbc) userDataPayload.fbc = userData.fbc;

    const eventData = {
      event_name: event,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: eventSourceUrl || "",
      action_source: "website",
      user_data: userDataPayload,
      custom_data: customData || {},
    };

    console.log("FB CAPI event:", event, "pixel:", pixelId);

    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [eventData],
        access_token: capiToken,
      }),
    });

    const result = await res.json();
    console.log("FB CAPI response:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fb-capi error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
