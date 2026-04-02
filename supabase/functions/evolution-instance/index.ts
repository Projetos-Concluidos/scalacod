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

  // JSONB strings may come with extra quotes — strip them
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
    const action = body.action; // "create" | "connect" | "status" | "disconnect" | "restart"
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
      // First try to fetch existing instance
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

      // If instance already exists, just get the QR code
      if (existingInstance) {
        const connectRes = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
          headers: { apikey: evoApiKey },
        });
        const connectData = await connectRes.json();

        // Update DB — select then update or insert
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

      // Create new instance
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
        
        // If instance already exists (403 "already in use"), fall through to connect
        if (createRes.status === 403 && errText.includes("already in use")) {
          console.log("Instance already exists on Evolution, connecting...");
          const connectRes = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
            headers: { apikey: evoApiKey },
          });
          const connectData = connectRes.ok ? await connectRes.json() : {};

          // Save to DB
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

      // Save to DB — select then update or insert
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

      // The create response may include QR in qrcode.base64
      let qrBase64 = createData.qrcode?.base64 || null;

      // If no QR in create response, try /instance/connect
      if (!qrBase64) {
        await new Promise((r) => setTimeout(r, 2000)); // Wait for instance to initialize
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

    // ─── STATUS (connection state) ───
    if (action === "status") {
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

      // If connected, update DB
      if (state === "open") {
        // Fetch instance info to get phone number
        const infoRes = await fetch(`${evoUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          headers: { apikey: evoApiKey },
        });
        let phoneNumber = "";
        if (infoRes.ok) {
          const instances = await infoRes.json();
          const inst = Array.isArray(instances) ? instances[0] : instances;
          phoneNumber = inst?.instance?.owner || "";
        }

        // Update or insert whatsapp_instances
        const { data: existingWi } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", "evolution")
          .maybeSingle();

        const wiPayload = { status: "connected", phone_number: phoneNumber, qr_code: null, instance_name: instanceName, evolution_server_url: evoUrl, api_key: evoApiKey };
        if (existingWi) {
          await supabaseAdmin.from("whatsapp_instances").update(wiPayload).eq("id", existingWi.id);
        } else {
          await supabaseAdmin.from("whatsapp_instances").insert({ ...wiPayload, user_id: user.id, provider: "evolution" });
        }

        // Upsert integrations table
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
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
