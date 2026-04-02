import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_VOICES = [
  { id: "alloy", name: "Alloy", previewUrl: null, category: "openai", labels: {}, language: "multi", gender: "neutral", useCase: "versatile" },
  { id: "echo", name: "Echo", previewUrl: null, category: "openai", labels: {}, language: "multi", gender: "male", useCase: "narration" },
  { id: "fable", name: "Fable", previewUrl: null, category: "openai", labels: {}, language: "multi", gender: "neutral", useCase: "storytelling" },
  { id: "onyx", name: "Onyx", previewUrl: null, category: "openai", labels: {}, language: "multi", gender: "male", useCase: "formal" },
  { id: "nova", name: "Nova", previewUrl: null, category: "openai", labels: {}, language: "multi", gender: "female", useCase: "conversational" },
  { id: "shimmer", name: "Shimmer", previewUrl: null, category: "openai", labels: {}, language: "multi", gender: "female", useCase: "soft" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check which provider is active
    const { data: configs } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["integration_elevenlabs_api_key", "integration_openai_api_key"]);

    const configMap: Record<string, string> = {};
    for (const c of configs || []) {
      let val = "";
      if (typeof c.value === "string") {
        val = c.value.replace(/^"+|"+$/g, "").trim();
      } else if (c.value && typeof c.value === "object" && (c.value as any).value) {
        val = String((c.value as any).value).replace(/^"+|"+$/g, "").trim();
      }
      if (val) configMap[c.key] = val;
    }

    const hasElevenLabsConfig = configs?.some(c => c.key === "integration_elevenlabs_api_key");
    const elevenLabsKey = configMap["integration_elevenlabs_api_key"] || (!hasElevenLabsConfig ? (Deno.env.get("ELEVENLABS_API_KEY") || "") : "");
    const openaiKey = configMap["integration_openai_api_key"] || "";
    console.log("TTS Provider Debug:", { hasElevenLabsConfig, elevenLabsKey: elevenLabsKey ? "SET" : "EMPTY", openaiKey: openaiKey ? "SET" : "EMPTY", configKeys: Object.keys(configMap), rawConfigs: configs?.map(c => ({ key: c.key, valType: typeof c.value, valTruthy: !!c.value })) });

    if (elevenLabsKey) {
      // ElevenLabs library
      const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": elevenLabsKey },
      });

      if (!res.ok) {
        const err = await res.text();
        return new Response(JSON.stringify({ error: "Erro ao buscar vozes: " + err }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const voices = (data.voices || []).map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        previewUrl: v.preview_url,
        category: v.category,
        labels: v.labels || {},
        language: v.labels?.language || v.fine_tuning?.language || null,
        gender: v.labels?.gender || null,
        useCase: v.labels?.use_case || null,
      }));

      return new Response(JSON.stringify({ voices, provider: "elevenlabs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (openaiKey) {
      // OpenAI voices (static list)
      return new Response(JSON.stringify({ voices: OPENAI_VOICES, provider: "openai" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ voices: [], provider: "none", error: "Nenhum provedor de TTS configurado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
