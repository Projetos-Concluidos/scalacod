import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const userId = formData.get("userId") as string;
    const files = formData.getAll("files") as File[];

    if (!name || !userId || files.length === 0) {
      return new Response(JSON.stringify({ error: "name, userId e files são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if ElevenLabs is active
    const { data: configs } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["integration_elevenlabs_api_key"]);

    let apiKey = "";
    for (const c of configs || []) {
      if (c.value && typeof c.value === "string") {
        apiKey = c.value;
      } else if (c.value && typeof c.value === "object" && (c.value as any).value) {
        apiKey = (c.value as any).value;
      }
    }

    // Fallback to env secret
    if (!apiKey) {
      apiKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Clonagem de voz requer ElevenLabs ativo. Configure a chave ElevenLabs nas integrações." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clone voice on ElevenLabs
    const elevenForm = new FormData();
    elevenForm.append("name", name);
    elevenForm.append("description", `Voz clonada por ${userId} via ScalaNinja`);
    for (const file of files) {
      elevenForm.append("files", file);
    }

    const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: elevenForm,
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail?.message || data.detail || "Erro ao clonar voz no ElevenLabs";
      return new Response(JSON.stringify({ error: msg }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to DB
    await supabase.from("voices").insert({
      user_id: userId,
      name,
      elevenlabs_voice_id: data.voice_id,
      is_cloned: true,
      is_favorite: false,
    });

    return new Response(JSON.stringify({ success: true, voiceId: data.voice_id, name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
