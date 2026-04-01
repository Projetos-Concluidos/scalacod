import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LOGZZ_WEBHOOK_URL = "https://app.logzz.com.br/api/importacao-de-pedidos/webhook/ori1xzrv";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, user_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch order
    const { data: order, error: orderErr } = await admin
      .from("orders").select("*").eq("id", order_id).single();
    if (orderErr || !order) {
      console.error("[logzz-create-order] Order not found:", order_id, orderErr?.message);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveUserId = user_id || order.user_id;
    console.log("[logzz-create-order] Processing order:", order_id, "user:", effectiveUserId);

    // 2. Skip if not logzz logistics
    if (order.logistics_type && order.logistics_type !== "logzz") {
      console.log("[logzz-create-order] Skipping - logistics_type:", order.logistics_type);
      return new Response(JSON.stringify({ skipped: true, reason: "not logzz logistics" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch Logzz integration
    const { data: integrations } = await admin
      .from("integrations").select("*").eq("user_id", effectiveUserId).eq("type", "logzz");
    const logzzInt = (integrations || [])[0];
    const logzzCfg = logzzInt?.config as any;
    const bearerToken = logzzCfg?.bearer_token;

    if (!bearerToken) {
      console.error("[logzz-create-order] No Logzz token configured for user:", effectiveUserId);
      return new Response(JSON.stringify({ error: "Logzz token not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Determine webhook URL (custom or default)
    const webhookUrl = logzzCfg?.logzz_webhook_url || DEFAULT_LOGZZ_WEBHOOK_URL;
    console.log("[logzz-create-order] Webhook URL:", webhookUrl);

    // 5. Get offer hash
    let offerHash = "";
    if (order.offer_id) {
      const { data: offerData } = await admin.from("offers").select("hash").eq("id", order.offer_id).maybeSingle();
      offerHash = offerData?.hash || "";
    }

    // 6. Build payload (exact Logzz format)
    const logzzPayload: any = {
      external_id: order.id,
      full_name: order.client_name,
      phone: (order.client_phone || "").replace(/\D/g, ""),
      customer_document: (order.client_document || "").replace(/\D/g, ""),
      postal_code: (order.client_zip_code || "").replace(/\D/g, ""),
      street: order.client_address || "",
      neighborhood: order.client_address_district || "",
      city: order.client_address_city || "",
      state: (order.client_address_state || "").toLowerCase(),
      house_number: order.client_address_number || "",
      complement: order.client_address_comp || "",
      delivery_date: order.delivery_date || "",
      offer: offerHash,
      affiliate_email: order.affiliate_email || "",
    };

    // 7. Fetch order bumps and variations if present
    if (order.offer_id) {
      const { data: orderBumps } = await admin
        .from("order_bumps")
        .select("hash, product_id")
        .eq("offer_id", order.offer_id)
        .eq("is_active", true);

      if (orderBumps && orderBumps.length > 0) {
        const bumpsPayload = [];
        for (const bump of orderBumps) {
          if (!bump.hash) {
            console.warn("[logzz-create-order] Skipping bump with null hash");
            continue;
          }
          const bumpEntry: any = { hash: bump.hash };
          // Fetch variations for this bump's product (only if product_id exists)
          if (bump.product_id) {
            const { data: vars } = await admin
              .from("product_variations")
              .select("hash")
              .eq("product_id", bump.product_id)
              .eq("is_active", true);
            if (vars && vars.length > 0) {
              bumpEntry.variations = vars.map((v: any) => ({ hash: v.hash, quantity: 1 }));
            }
          }
          bumpsPayload.push(bumpEntry);
        }
        if (bumpsPayload.length > 0) {
          logzzPayload.bumps = bumpsPayload;
        }
      }

      // Fetch main product variations
      const { data: offerData } = await admin.from("offers").select("product_id").eq("id", order.offer_id).maybeSingle();
      if (offerData?.product_id) {
        const { data: mainVars } = await admin
          .from("product_variations")
          .select("hash")
          .eq("product_id", offerData.product_id)
          .eq("is_active", true);
        if (mainVars && mainVars.length > 0) {
          logzzPayload.variations = mainVars.map((v: any) => ({ hash: v.hash, quantity: 1 }));
        }
      }
    }

    console.log("[logzz-create-order] Payload:", JSON.stringify(logzzPayload));

    // 8. Send to Logzz webhook (exact ScalaCOD headers)
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": BROWSER_UA,
        "Authorization": `bearer ${bearerToken}`,
      },
      body: JSON.stringify(logzzPayload),
    });

    const resBody = await res.text();
    console.log("[logzz-create-order] Response:", res.status, resBody.substring(0, 500));

    // 9. Process result
    if (res.ok) {
      let logzzOrderId: string | null = null;
      try {
        const parsed = JSON.parse(resBody);
        logzzOrderId = parsed?.data?.id || parsed?.id || parsed?.order_id || null;
        if (typeof logzzOrderId === "number") logzzOrderId = String(logzzOrderId);
      } catch { /* non-JSON ok response */ }

      const prevStatus = order.status;

      // Update order
      await admin.from("orders").update({
        status: "Agendado",
        logzz_order_id: logzzOrderId,
        updated_at: new Date().toISOString(),
      }).eq("id", order_id);

      // Record status history
      await admin.from("order_status_history").insert({
        order_id: order_id,
        from_status: prevStatus,
        to_status: "Agendado",
        source: "logzz_create_order",
        raw_payload: { webhook_url: webhookUrl, logzz_status: res.status, logzz_body: resBody.substring(0, 500) },
      });

      console.log("[logzz-create-order] SUCCESS! logzz_order_id:", logzzOrderId);

      return new Response(JSON.stringify({
        success: true,
        logzz_order_id: logzzOrderId,
        logzz_status: res.status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      console.error("[logzz-create-order] FAILED:", res.status, resBody.substring(0, 300));
      return new Response(JSON.stringify({
        success: false,
        logzz_status: res.status,
        logzz_response: resBody.substring(0, 1000),
        webhook_url: webhookUrl,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("[logzz-create-order] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
