import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getGlobalCredentials(supabaseAdmin: any) {
  const { data } = await supabaseAdmin
    .from("system_config")
    .select("key, value")
    .in("key", ["integration_evolution_url", "integration_evolution_api_key"]);

  const rawUrl = data?.find((d: any) => d.key === "integration_evolution_url")?.value;
  const rawKey = data?.find((d: any) => d.key === "integration_evolution_api_key")?.value;

  const cleanStr = (v: any): string => {
    if (typeof v === "string") return v.replace(/^"|"$/g, "").trim();
    return String(v ?? "").replace(/^"|"$/g, "").trim();
  };

  const urlStr = cleanStr(rawUrl).replace(/\/$/, "");
  const keyStr = cleanStr(rawKey);

  if (!urlStr || !keyStr) {
    throw new Error("Evolution API não configurada pelo administrador da plataforma.");
  }
  return { url: urlStr, apiKey: keyStr };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action; // "create" | "connect" | "status" | "disconnect" | "restart" | "health"
    const instanceName = body.instance_name;

    if (!instanceName) {
      return new Response(JSON.stringify({ error: "instance_name é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url: evoUrl, apiKey: evoApiKey } = await getGlobalCredentials(supabaseAdmin);
    const headers = { "Content-Type": "application/json", apikey: evoApiKey };

    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook?user_id=${user.id}&provider=evolution`;

    // ─── CREATE INSTANCE ───
    if (action === "create") {
      const fetchRes = await fetch(`${evoUrl}/instance/fetchInstances`, {
        headers: { apikey: evoApiKey },
      });

      let existingInstance = null;
      if (fetchRes.ok) {
        const instances = await fetchRes.json();
        existingInstance = Array.isArray(instances)
          ? instances.find((i: any) => i.instance?.instanceName === instanceName)
          : null;
      }

      if (existingInstance) {
        const connectRes = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
          headers: { apikey: evoApiKey },
        });
        const connectData = await connectRes.json();

        const { data: existRow } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", "evolution")
          .maybeSingle();

        const payload = {
          user_id: user.id,
          provider: "evolution",
          instance_name: instanceName,
          status: "qr_ready",
          webhook_url: webhookUrl,
        };

        if (existRow) {
          await supabaseAdmin.from("whatsapp_instances").update(payload).eq("id", existRow.id);
        } else {
          await supabaseAdmin.from("whatsapp_instances").insert(payload);
        }

        return new Response(JSON.stringify({
          success: true,
          action: "existing_instance_connected",
          qrcode: connectData.base64 || null,
          pairingCode: connectData.pairingCode || null,
          status: connectData.state || "connecting",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const createPayload = {
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: [
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "SEND_MESSAGE",
          ],
        },
      };

      const createRes = await fetch(`${evoUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(createPayload),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();

        if (createRes.status === 403 && errText.includes("already in use")) {
          console.log("Instance already exists on Evolution, connecting...");
          const connectRes = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
            headers: { apikey: evoApiKey },
          });
          const connectData = connectRes.ok ? await connectRes.json() : {};

          const { data: existRow2 } = await supabaseAdmin
            .from("whatsapp_instances")
            .select("id")
            .eq("user_id", user.id)
            .eq("provider", "evolution")
            .maybeSingle();

          const payload2 = {
            user_id: user.id,
            provider: "evolution",
            instance_name: instanceName,
            status: "qr_ready",
            webhook_url: webhookUrl,
          };

          if (existRow2) {
            await supabaseAdmin.from("whatsapp_instances").update(payload2).eq("id", existRow2.id);
          } else {
            await supabaseAdmin.from("whatsapp_instances").insert(payload2);
          }

          return new Response(JSON.stringify({
            success: true,
            action: "existing_instance_connected",
            qrcode: connectData.base64 || null,
            pairingCode: connectData.pairingCode || null,
            status: connectData.state || "connecting",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          error: `Erro ao criar instância: ${createRes.status} - ${errText.slice(0, 300)}`,
        }), {
          status: createRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const createData = await createRes.json();

      const { data: existingRow } = await supabaseAdmin
        .from("whatsapp_instances")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", "evolution")
        .maybeSingle();

      const instancePayload = {
        user_id: user.id,
        provider: "evolution",
        instance_name: instanceName,
        status: "qr_ready",
        webhook_url: webhookUrl,
        api_key: createData.hash || null,
        evolution_server_url: evoUrl,
      };

      if (existingRow) {
        await supabaseAdmin.from("whatsapp_instances").update(instancePayload).eq("id", existingRow.id);
      } else {
        await supabaseAdmin.from("whatsapp_instances").insert(instancePayload);
      }

      let qrBase64 = createData.qrcode?.base64 || null;

      if (!qrBase64) {
        await new Promise((r) => setTimeout(r, 2000));
        const connectRes = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
          headers: { apikey: evoApiKey },
        });
        if (connectRes.ok) {
          const connectData = await connectRes.json();
          qrBase64 = connectData.base64 || null;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        action: "created",
        qrcode: qrBase64,
        pairingCode: createData.qrcode?.pairingCode || null,
        instanceId: createData.instance?.instanceId || null,
        hash: createData.hash || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CONNECT (get QR code) ───
    if (action === "connect") {
      const res = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
        headers: { apikey: evoApiKey },
      });
      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({
          error: `Erro ao obter QR: ${res.status} - ${errText.slice(0, 300)}`,
        }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();
      return new Response(JSON.stringify({
        success: true,
        qrcode: data.base64 || null,
        pairingCode: data.pairingCode || null,
        count: data.count || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── STATUS (connection state + detailed diagnostics) ───
    if (action === "status") {
      // 1. Get connectionState
      const res = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: evoApiKey },
      });
      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({
          error: `Erro: ${res.status} - ${errText.slice(0, 300)}`,
        }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();
      const state = data.instance?.state || data.state || "unknown";

      // 2. Fetch detailed instance info
      let instanceInfo: any = null;
      let profileName = "";
      let phoneNumber = "";
      let ownerJid = "";

      try {
        const infoRes = await fetch(`${evoUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          headers: { apikey: evoApiKey },
        });
        if (infoRes.ok) {
          const instances = await infoRes.json();
          const inst = Array.isArray(instances) ? instances[0] : instances;
          instanceInfo = inst;
          ownerJid = inst?.instance?.owner || "";
          profileName = inst?.instance?.profileName || "";
          phoneNumber = ownerJid;
          if (phoneNumber.includes("@")) {
            phoneNumber = phoneNumber.split("@")[0];
          }
          console.log(`[evolution-instance] fetchInstances: owner=${ownerJid}, profileName=${profileName}, state=${state}`);
        }
      } catch (e) {
        console.warn("[evolution-instance] fetchInstances failed:", e.message);
      }

      // 3. If state is "open", do a health check by verifying the instance's own number
      let sessionHealthy = false;
      let healthCheckResult = "not_tested";

      if (state === "open" && phoneNumber) {
        try {
          // Use the instance's own number for a quick health check
          const checkRes = await fetch(`${evoUrl}/chat/whatsappNumbers/${instanceName}`, {
            method: "POST",
            headers: { apikey: evoApiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ numbers: [`${phoneNumber}`] }),
          });

          if (checkRes.ok) {
            const checkData = await checkRes.json();
            // checkData is typically an array of { exists, jid, number }
            const results = Array.isArray(checkData) ? checkData : [];
            sessionHealthy = results.some((r: any) => r.exists === true);
            healthCheckResult = sessionHealthy ? "healthy" : "degraded";
            console.log(`[evolution-instance] Health check: ${healthCheckResult}`, JSON.stringify(results));
          } else {
            healthCheckResult = "check_failed";
            console.warn(`[evolution-instance] Health check HTTP ${checkRes.status}`);
          }
        } catch (e) {
          healthCheckResult = "check_error";
          console.warn("[evolution-instance] Health check error:", e.message);
        }
      } else if (state === "open") {
        // Open but no phone number — can't verify health
        healthCheckResult = "no_phone_to_verify";
        sessionHealthy = true; // assume healthy if we can't test
      }

      // 4. Update DB if connected
      if (state === "open") {
        const { data: existingWi } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", "evolution")
          .maybeSingle();

        const wiPayload = {
          status: "connected",
          phone_number: phoneNumber,
          qr_code: null,
          instance_name: instanceName,
          evolution_server_url: evoUrl,
          api_key: evoApiKey,
        };
        if (existingWi) {
          await supabaseAdmin.from("whatsapp_instances").update(wiPayload).eq("id", existingWi.id);
        } else {
          await supabaseAdmin.from("whatsapp_instances").insert({ ...wiPayload, user_id: user.id, provider: "evolution" });
        }

        const { data: existing } = await supabaseAdmin
          .from("integrations")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "evolution")
          .maybeSingle();

        const integrationPayload = {
          user_id: user.id,
          type: "evolution",
          config: { instance_name: instanceName },
          is_active: true,
        };

        if (existing) {
          await supabaseAdmin.from("integrations").update(integrationPayload).eq("id", existing.id);
        } else {
          await supabaseAdmin.from("integrations").insert(integrationPayload);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        state,
        connected: state === "open",
        profileName,
        phoneNumber,
        ownerJid,
        sessionHealthy,
        healthCheckResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── HEALTH CHECK (standalone) ───
    if (action === "health") {
      // Run a quick number verification to test if Baileys session is truly operational
      const testPhone = body.test_phone;

      // First get connection state
      const stateRes = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: evoApiKey },
      });
      const stateData = stateRes.ok ? await stateRes.json() : {};
      const state = stateData.instance?.state || stateData.state || "unknown";

      if (state !== "open") {
        return new Response(JSON.stringify({
          success: true,
          state,
          connected: false,
          sessionHealthy: false,
          healthCheckResult: "disconnected",
          message: "Instância não está conectada",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the instance's own number for self-check
      let ownNumber = "";
      try {
        const infoRes = await fetch(`${evoUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          headers: { apikey: evoApiKey },
        });
        if (infoRes.ok) {
          const instances = await infoRes.json();
          const inst = Array.isArray(instances) ? instances[0] : instances;
          ownNumber = (inst?.instance?.owner || "").split("@")[0];
        }
      } catch (_) {}

      const numbersToCheck = ownNumber ? [ownNumber] : [];
      if (testPhone) {
        const clean = testPhone.replace(/\D/g, "");
        if (clean.length >= 10) numbersToCheck.push(clean.startsWith("55") ? clean : `55${clean}`);
      }

      if (numbersToCheck.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          state: "open",
          connected: true,
          sessionHealthy: null,
          healthCheckResult: "no_numbers_to_check",
          message: "Sem números disponíveis para verificar saúde da sessão",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const checkRes = await fetch(`${evoUrl}/chat/whatsappNumbers/${instanceName}`, {
          method: "POST",
          headers: { apikey: evoApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ numbers: numbersToCheck }),
        });

        if (checkRes.ok) {
          const results = await checkRes.json();
          const existsCount = Array.isArray(results) ? results.filter((r: any) => r.exists).length : 0;
          const sessionHealthy = existsCount > 0;

          return new Response(JSON.stringify({
            success: true,
            state: "open",
            connected: true,
            sessionHealthy,
            healthCheckResult: sessionHealthy ? "healthy" : "degraded",
            details: results,
            message: sessionHealthy
              ? "Sessão Baileys operacional — verificação de números funcionando"
              : "Sessão Baileys degradada — verificação de números retornando false. Recomenda-se reconectar.",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({
            success: true,
            state: "open",
            connected: true,
            sessionHealthy: false,
            healthCheckResult: "check_failed",
            message: `Checagem falhou com HTTP ${checkRes.status}`,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({
          success: true,
          state: "open",
          connected: true,
          sessionHealthy: false,
          healthCheckResult: "check_error",
          message: e.message,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── DISCONNECT ───
    if (action === "disconnect") {
      const res = await fetch(`${evoUrl}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: evoApiKey },
      });

      await supabaseAdmin.from("whatsapp_instances")
        .update({ status: "disconnected", qr_code: null, phone_number: null })
        .eq("user_id", user.id)
        .eq("provider", "evolution");

      await supabaseAdmin.from("integrations")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("type", "evolution");

      return new Response(JSON.stringify({ success: true, action: "disconnected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESTART ───
    if (action === "restart") {
      const res = await fetch(`${evoUrl}/instance/restart/${instanceName}`, {
        method: "PUT",
        headers: { apikey: evoApiKey },
      });

      return new Response(JSON.stringify({
        success: true,
        action: "restarted",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("evolution-instance error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
