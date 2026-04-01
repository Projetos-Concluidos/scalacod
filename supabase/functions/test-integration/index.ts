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
    // Verify superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ success: false, message: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, credentials } = await req.json();

    let testResult: { success: boolean; message: string };

    switch (provider) {
      case "evolution": {
        const url = credentials.evolution_url?.replace(/\/$/, "");
        const apiKey = credentials.evolution_api_key;
        if (!url || !apiKey) {
          testResult = { success: false, message: "URL e API Key são obrigatórios" };
          break;
        }
        const res = await fetch(`${url}/instance/fetchInstances`, {
          headers: { apikey: apiKey },
        });
        if (res.ok) {
          const data = await res.json();
          const count = Array.isArray(data) ? data.length : 0;
          testResult = { success: true, message: `Conectado! ${count} instância(s) encontrada(s).` };
        } else {
          const text = await res.text();
          testResult = { success: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
        }
        break;
      }

      case "mercadopago": {
        const token = credentials.mp_access_token;
        if (!token) {
          testResult = { success: false, message: "Access Token é obrigatório" };
          break;
        }
        const res = await fetch("https://api.mercadopago.com/v1/payment_methods", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          testResult = { success: true, message: `Conectado! ${data.length} métodos de pagamento disponíveis.` };
        } else {
          const text = await res.text();
          testResult = { success: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
        }
        break;
      }

      case "elevenlabs": {
        const apiKey = credentials.elevenlabs_api_key;
        if (!apiKey) {
          testResult = { success: false, message: "API Key é obrigatória" };
          break;
        }
        const res = await fetch("https://api.elevenlabs.io/v1/user", {
          headers: { "xi-api-key": apiKey },
        });
        if (res.ok) {
          const data = await res.json();
          testResult = { success: true, message: `Conectado! Conta: ${data.subscription?.tier || "ativa"}` };
        } else {
          const text = await res.text();
          testResult = { success: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
        }
        break;
      }

      case "openai": {
        const apiKey = credentials.openai_api_key;
        if (!apiKey) {
          testResult = { success: false, message: "API Key é obrigatória" };
          break;
        }
        const res = await fetch("https://api.openai.com/v1/models?limit=1", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          testResult = { success: true, message: "Conectado! API Key válida." };
          await res.text();
        } else {
          const text = await res.text();
          testResult = { success: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
        }
        break;
      }

      default:
        testResult = { success: false, message: `Provedor desconhecido: ${provider}` };
    }

    return new Response(JSON.stringify(testResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
