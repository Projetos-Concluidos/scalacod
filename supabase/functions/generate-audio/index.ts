import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenAI voice names accepted directly
const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { voiceId, text, userId } = await req.json();

    if (!voiceId || !text || !userId) {
      return new Response(JSON.stringify({ error: "voiceId, text e userId são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check token balance
    const { data: tokenData } = await supabase
      .from("voice_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const tokensNeeded = text.length;
    const currentBalance = tokenData?.balance || 0;

    if (currentBalance < tokensNeeded) {
      return new Response(
        JSON.stringify({
          error: `Tokens insuficientes. Você tem ${currentBalance}, precisa de ${tokensNeeded}.`,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine provider from system_config
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

    // If system_config has an explicit entry (even empty), it takes precedence over env
    const hasElevenLabsConfig = configs?.some(c => c.key === "integration_elevenlabs_api_key");
    const elevenLabsKey = configMap["integration_elevenlabs_api_key"] || (!hasElevenLabsConfig ? (Deno.env.get("ELEVENLABS_API_KEY") || "") : "");
    const openaiKey = configMap["integration_openai_api_key"] || "";

    let audioBuffer: ArrayBuffer;
    let provider: string;

    if (elevenLabsKey) {
      // === ElevenLabs path ===
      provider = "elevenlabs";
      const ttsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.75, similarity_boost: 0.85 },
          }),
        }
      );

      if (!ttsRes.ok) {
        const errData = await ttsRes.json().catch(() => ({}));
        const rawMsg = errData.detail?.message || errData.detail || "";
        let userMsg = "Erro ao gerar áudio no ElevenLabs";
        if (typeof rawMsg === "string" && rawMsg.toLowerCase().includes("free users")) {
          userMsg = "A chave ElevenLabs está no plano gratuito e não permite usar vozes da biblioteca. Peça ao administrador para fazer upgrade no ElevenLabs ou use uma voz clonada.";
        } else if (rawMsg) {
          userMsg = String(rawMsg);
        }
        return new Response(
          JSON.stringify({ error: userMsg }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      audioBuffer = await ttsRes.arrayBuffer();
    } else if (openaiKey) {
      // === OpenAI TTS path ===
      provider = "openai";
      // Map voiceId: if it's an OpenAI voice name use it directly, otherwise default to "nova"
      const openaiVoice = OPENAI_VOICES.includes(voiceId) ? voiceId : "nova";

      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          voice: openaiVoice,
          input: text,
          response_format: "mp3",
        }),
      });

      if (!ttsRes.ok) {
        const errData = await ttsRes.json().catch(() => ({}));
        const errMsg = errData.error?.message || "Erro ao gerar áudio na OpenAI";
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: ttsRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      audioBuffer = await ttsRes.arrayBuffer();
    } else {
      return new Response(
        JSON.stringify({ error: "Nenhum provedor de TTS configurado. Peça ao administrador para configurar ElevenLabs ou OpenAI nas integrações." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileName = `voices/${userId}/${Date.now()}.mp3`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(fileName, audioBuffer, { contentType: "audio/mpeg", upsert: false });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Erro ao salvar áudio: " + uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Debit tokens atomically
    const { data: debited, error: debitError } = await supabase.rpc("debit_voice_tokens", {
      p_user_id: userId,
      p_amount: tokensNeeded,
    });
    if (debitError || !debited) {
      return new Response(
        JSON.stringify({ error: "Tokens insuficientes ou erro ao debitar." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check remaining balance and alert if low
    try {
      const { data: updated } = await supabase
        .from("voice_tokens")
        .select("total_purchased, total_used")
        .eq("user_id", userId)
        .maybeSingle();
      const remaining = (updated?.total_purchased || 0) - (updated?.total_used || 0);
      if (remaining < 100 && remaining >= 0) {
        // Check prefs
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("alert_low_tokens")
          .eq("user_id", userId)
          .maybeSingle();
        if (prefs?.alert_low_tokens) {
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "⚠️ Saldo de tokens baixo!",
            body: `Restam apenas ${remaining} tokens de voz. Recarregue para continuar gerando áudios.`,
            type: "low_tokens",
          });
        }
      }
    } catch (e) {
      console.warn("[generate-audio] Low token alert error:", e.message);
    }

    return new Response(
      JSON.stringify({ audioUrl: publicUrl, tokensUsed: tokensNeeded, provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
