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

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate audio via ElevenLabs
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
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
      return new Response(
        JSON.stringify({ error: errData.detail?.message || "Erro ao gerar áudio no ElevenLabs" }),
        { status: ttsRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await ttsRes.arrayBuffer();
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

    // Debit tokens
    if (tokenData) {
      await supabase
        .from("voice_tokens")
        .update({
          balance: currentBalance - tokensNeeded,
          total_used: (tokenData.total_used || 0) + tokensNeeded,
        })
        .eq("id", tokenData.id);
    }

    return new Response(
      JSON.stringify({ audioUrl: publicUrl, tokensUsed: tokensNeeded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
