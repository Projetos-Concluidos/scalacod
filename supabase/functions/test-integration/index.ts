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

    const { provider, credentials } = await req.json();

    // Tenant-level providers don't require superadmin
    const tenantProviders = ["mercadopago_tenant", "coinzz_tenant", "logzz_tenant", "hyppe_tenant"];
    const isTenantProvider = tenantProviders.includes(provider);

    if (!isTenantProvider) {
      // Admin-level: verify superadmin
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
    }

    let testResult: { success: boolean; message: string };

    switch (provider) {
      // ═══════════════ ADMIN PROVIDERS ═══════════════
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
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": apiKey },
        });
        if (res.ok) {
          const data = await res.json();
          const count = Array.isArray(data.voices) ? data.voices.length : 0;
          testResult = { success: true, message: `Conectado! ${count} voz(es) disponível(is).` };
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
        const res = await fetch("https://api.openai.com/v1/models/tts-1", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          testResult = { success: true, message: "Conectado! Modelo TTS-1 acessível." };
          await res.text();
        } else {
          const text = await res.text();
          testResult = { success: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
        }
        break;
      }

      // ═══════════════ TENANT PROVIDERS ═══════════════
      case "mercadopago_tenant": {
        const token = credentials.access_token;
        if (!token) {
          testResult = { success: false, message: "Access Token é obrigatório" };
          break;
        }
        const res = await fetch("https://api.mercadopago.com/v1/payment_methods", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const pixAvailable = data.some((m: any) => m.id === "pix");
          testResult = {
            success: true,
            message: `✅ Conectado! ${data.length} métodos disponíveis${pixAvailable ? " (PIX ativo)" : ""}.`,
          };
        } else {
          const text = await res.text();
          testResult = { success: false, message: `Erro ${res.status}: Token inválido ou expirado. ${text.slice(0, 100)}` };
        }
        break;
      }

      case "coinzz_tenant": {
        const token = credentials.bearer_token;
        if (!token) {
          testResult = { success: false, message: "Bearer Token é obrigatório" };
          break;
        }
        // Test Coinzz by calling their products endpoint
        const res = await fetch("https://app.coinzz.com.br/api/products", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (res.ok) {
          testResult = { success: true, message: "✅ Conectado à Coinzz! Token válido." };
        } else if (res.status === 401) {
          testResult = { success: false, message: "Token inválido ou expirado." };
        } else {
          const text = await res.text();
          testResult = { success: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
        }
        break;
      }

      case "logzz_tenant": {
        const token = credentials.bearer_token;
        if (!token) {
          testResult = { success: false, message: "Bearer Token é obrigatório" };
          break;
        }
        const res = await fetch("https://app.logzz.com.br/api/v1/products", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (res.ok) {
          testResult = { success: true, message: "✅ Conectado à Logzz! Token válido." };
        } else if (res.status === 401) {
          testResult = { success: false, message: "Token inválido ou expirado." };
        } else {
          const text = await res.text();
          testResult = { success: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
        }
        break;
      }

      case "hyppe_tenant": {
        const token = credentials.api_token;
        if (!token) {
          testResult = { success: false, message: "API Token é obrigatório" };
          break;
        }
        const res = await fetch("https://app.hyppe.com.br/api/produtos?limite=1", {
          headers: { Authorization: token, Accept: "application/json" },
        });
        if (res.ok) {
          testResult = { success: true, message: "✅ Conectado à Hyppe! Token válido." };
        } else if (res.status === 401) {
          testResult = { success: false, message: "Token inválido ou expirado." };
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
