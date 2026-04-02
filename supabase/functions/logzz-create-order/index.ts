import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LOGZZ_WEBHOOK_URL = "https://app.logzz.com.br/api/importacao-de-pedidos/webhook/ori1xzrv";

// Realistic browser headers to bypass Cloudflare
const BROWSER_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Origin": "https://app.logzz.com.br",
  "Referer": "https://app.logzz.com.br/",
  "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Connection": "keep-alive",
};

// FIX 2: Retry with exponential jitter for Cloudflare 403
async function sendToLogzz(
  url: string,
  payload: Record<string, unknown>,
  token: string,
  attempt = 1
): Promise<{ status: number; body: string }> {
  const headers = {
    ...BROWSER_HEADERS,
    Authorization: `bearer ${token}`,
  };

  console.log(`[logzz-create-order] Attempt ${attempt} → POST ${url}`);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  // Detect Cloudflare JS challenge (HTML instead of JSON)
  if (
    response.status === 403 &&
    (responseText.includes("cf-browser-verification") ||
      responseText.includes("challenge-platform") ||
      responseText.includes("<!DOCTYPE html>"))
  ) {
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`[logzz-create-order] CF challenge detected, retrying in ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return sendToLogzz(url, payload, token, attempt + 1);
    }
    console.error(`[logzz-create-order] CF challenge persists after ${attempt} attempts`);
  }

  return { status: response.status, body: responseText };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, user_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) {
      console.error("[logzz-create-order] Order not found:", order_id, orderErr?.message);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveUserId = user_id || order.user_id;
    console.log("[logzz-create-order] Processing order:", order_id, "user:", effectiveUserId);

    // 2. Skip if not logzz logistics
    if (order.logistics_type && order.logistics_type !== "logzz") {
      console.log("[logzz-create-order] Skipping - logistics_type:", order.logistics_type);
      return new Response(
        JSON.stringify({ skipped: true, reason: "not logzz logistics" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch Logzz integration
    const { data: integrations } = await admin
      .from("integrations")
      .select("*")
      .eq("user_id", effectiveUserId)
      .eq("type", "logzz");
    const logzzInt = (integrations || [])[0];
    const logzzCfg = logzzInt?.config as any;
    const bearerToken = logzzCfg?.bearer_token;

    if (!bearerToken) {
      console.error("[logzz-create-order] No Logzz token configured for user:", effectiveUserId);
      return new Response(JSON.stringify({ error: "Logzz token not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Determine webhook URL (custom or default)
    const webhookUrl = logzzCfg?.logzz_webhook_url || DEFAULT_LOGZZ_WEBHOOK_URL;
    console.log("[logzz-create-order] Webhook URL:", webhookUrl);

    // 5. Get offer hash
    let offerHash = "";
    if (order.offer_id) {
      const { data: offerData } = await admin
        .from("offers")
        .select("hash")
        .eq("id", order.offer_id)
        .maybeSingle();
      offerHash = offerData?.hash || "";
    }

    // 6. Build payload (exact Logzz format)
    const logzzPayload: Record<string, unknown> = {
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

    // 7. Fetch order bumps — FIX 3: filter out bumps with null/empty hash
    if (order.offer_id) {
      const { data: orderBumps } = await admin
        .from("order_bumps")
        .select("hash, product_id")
        .eq("offer_id", order.offer_id)
        .eq("is_active", true);

      if (orderBumps && orderBumps.length > 0) {
        const bumpsPayload: any[] = [];
        for (const bump of orderBumps) {
          // FIX 3: Skip bumps with null or empty hash
          if (!bump.hash || bump.hash.trim() === "") {
            console.warn("[logzz-create-order] Skipping bump with null/empty hash");
            continue;
          }
          const bumpEntry: any = { hash: bump.hash };
          // Fetch variations only if product_id exists
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
        // Only include bumps array if there are valid entries
        if (bumpsPayload.length > 0) {
          logzzPayload.bumps = bumpsPayload;
        }
      }

      // Fetch main product variations
      const { data: offerData } = await admin
        .from("offers")
        .select("product_id")
        .eq("id", order.offer_id)
        .maybeSingle();
      if (offerData?.product_id) {
        const { data: mainVars } = await admin
          .from("product_variations")
          .select("hash")
          .eq("product_id", offerData.product_id)
          .eq("is_active", true);
        if (mainVars && mainVars.length > 0) {
          logzzPayload.variations = mainVars.map((v: any) => ({
            hash: v.hash,
            quantity: 1,
          }));
        }
      }
    }

    console.log("[logzz-create-order] Payload:", JSON.stringify(logzzPayload));
    console.log("[logzz-create-order] Has bumps:", !!logzzPayload.bumps, "Count:", Array.isArray(logzzPayload.bumps) ? (logzzPayload.bumps as any[]).length : 0);

    // 8. Send to Logzz with retry (FIX 2)
    const { status: resStatus, body: resBody } = await sendToLogzz(
      webhookUrl,
      logzzPayload,
      bearerToken
    );

    console.log("[logzz-create-order] Response:", resStatus, resBody.substring(0, 500));

    // 9. Process result
    if (resStatus >= 200 && resStatus < 300) {
      let logzzOrderId: string | null = null;
      try {
        const parsed = JSON.parse(resBody);
        logzzOrderId = parsed?.data?.id || parsed?.id || parsed?.order_id || null;
        if (typeof logzzOrderId === "number") logzzOrderId = String(logzzOrderId);
      } catch {
        /* non-JSON ok response */
      }

      const prevStatus = order.status;

      // Update order
      await admin
        .from("orders")
        .update({
          status: "Agendado",
          logzz_order_id: logzzOrderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);

      // Record status history
      await admin.from("order_status_history").insert({
        order_id: order_id,
        from_status: prevStatus,
        to_status: "Agendado",
        source: "logzz_create_order",
        raw_payload: {
          webhook_url: webhookUrl,
          logzz_status: resStatus,
          logzz_body: resBody.substring(0, 500),
        },
      });

      console.log("[logzz-create-order] SUCCESS! logzz_order_id:", logzzOrderId);

      return new Response(
        JSON.stringify({
          success: true,
          logzz_order_id: logzzOrderId,
          logzz_status: resStatus,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("[logzz-create-order] FAILED:", resStatus, resBody.substring(0, 300));

      // Record sync failure in order history for timeline visibility
      let errorMsg = resBody.substring(0, 500);
      try {
        const parsed = JSON.parse(resBody);
        errorMsg = parsed?.message || parsed?.error || errorMsg;
      } catch { /* keep raw */ }

      await admin.from("order_status_history").insert({
        order_id: order_id,
        from_status: order.status,
        to_status: "logzz_error",
        source: "logzz_create_order",
        raw_payload: {
          webhook_url: webhookUrl,
          logzz_status: resStatus,
          logzz_error: errorMsg,
          logzz_body: resBody.substring(0, 500),
        },
      });

      return new Response(
        JSON.stringify({
          success: false,
          logzz_status: resStatus,
          logzz_response: resBody.substring(0, 1000),
          webhook_url: webhookUrl,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (e: any) {
    console.error("[logzz-create-order] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
