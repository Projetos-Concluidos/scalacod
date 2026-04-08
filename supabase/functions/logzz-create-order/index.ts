import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LOGZZ_WEBHOOK_URL = "https://app.logzz.com.br/api/importacao-de-pedidos/webhook/ori1xzrv";

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

// Helper: calculate next business date (skips Sundays)
function getNextBusinessDate(daysAhead: number): string {
  const date = new Date();
  let added = 0;
  while (added < daysAhead) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) { // skip Sunday
      added++;
    }
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper: check if date string is in the past
function isDatePast(dateStr: string): boolean {
  if (!dateStr) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return target < today;
}

// Retry with exponential jitter for Cloudflare 403
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

  // Detect Cloudflare JS challenge
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

    // 4. Determine webhook URL
    const webhookUrl = logzzCfg?.logzz_webhook_url || DEFAULT_LOGZZ_WEBHOOK_URL;
    console.log("[logzz-create-order] Webhook URL:", webhookUrl);

    // 4.5 Re-validate delivery date & fetch local_operation_code
    let finalDeliveryDate = order.delivery_date || "";
    let finalTypeCode = order.delivery_type_code || "";
    let localOperationCode = order.local_operation_code || "";
    let apiValidationSucceeded = false;

    if (order.client_zip_code) {
      const cleanCep = (order.client_zip_code || "").replace(/\D/g, "");
      try {
        const logzzUrl = `https://app.logzz.com.br/api/delivery-day/options/zip-code/${cleanCep}`;
        console.log("[logzz-create-order] Re-validating dates for CEP:", cleanCep);
        const dateRes = await fetch(logzzUrl, {
          headers: { Authorization: `Bearer ${bearerToken}`, Accept: "application/json", "User-Agent": "Mozilla/5.0 Chrome/120" },
        });
        const dateText = await dateRes.text();
        if (dateRes.ok && !dateText.includes("<!DOCTYPE html>")) {
          const dateData = JSON.parse(dateText);
          let datesAvail: any[] = [];
          if (dateData?.data?.response?.dates_available?.length > 0) datesAvail = dateData.data.response.dates_available;
          else if (dateData?.response?.dates_available?.length > 0) datesAvail = dateData.response.dates_available;
          else if (dateData?.data?.dates_available?.length > 0) datesAvail = dateData.data.dates_available;
          else if (dateData?.dates_available?.length > 0) datesAvail = dateData.dates_available;
          else if (Array.isArray(dateData) && dateData[0]?.date) datesAvail = dateData;
          else if (Array.isArray(dateData?.data) && dateData.data[0]?.date) datesAvail = dateData.data;

          console.log("[logzz-create-order] Available dates:", datesAvail.length);

          if (datesAvail.length > 0) {
            apiValidationSucceeded = true;
            const match = datesAvail.find((d: any) => d.date === finalDeliveryDate);
            if (match) {
              finalTypeCode = match.type_code || finalTypeCode;
              localOperationCode = match.local_operation_code || "";
              console.log("[logzz-create-order] Date validated OK:", finalDeliveryDate);
            } else {
              const first = datesAvail[0];
              finalDeliveryDate = first.date;
              finalTypeCode = first.type_code || finalTypeCode;
              localOperationCode = first.local_operation_code || "";
              console.log("[logzz-create-order] Date re-assigned to:", finalDeliveryDate);
              await admin.from("orders").update({
                delivery_date: finalDeliveryDate,
                delivery_type_code: finalTypeCode,
                local_operation_code: localOperationCode,
              }).eq("id", order_id);
            }
          }
        } else {
          console.warn("[logzz-create-order] Date API returned non-JSON or error:", dateRes.status);
        }
      } catch (dateErr: any) {
        console.warn("[logzz-create-order] Date re-validation error:", dateErr.message);
      }
    }

    // FALLBACK: If API validation failed and date is past/empty, calculate locally
    if (!apiValidationSucceeded && isDatePast(finalDeliveryDate)) {
      const fallbackDate = getNextBusinessDate(2);
      console.log(`[logzz-create-order] Date fallback: "${finalDeliveryDate}" is past/empty → using ${fallbackDate}`);
      finalDeliveryDate = fallbackDate;
      await admin.from("orders").update({ delivery_date: finalDeliveryDate }).eq("id", order_id);
    }

    // Final safety: ensure date is never in the past
    if (isDatePast(finalDeliveryDate)) {
      const safeDate = getNextBusinessDate(2);
      console.log(`[logzz-create-order] Safety check: "${finalDeliveryDate}" still past → ${safeDate}`);
      finalDeliveryDate = safeDate;
      await admin.from("orders").update({ delivery_date: finalDeliveryDate }).eq("id", order_id);
    }

    // 5. Get offer hash and affiliate_code
    let offerHash = "";
    let affiliateCode = "";
    if (order.offer_id) {
      const { data: offerData } = await admin
        .from("offers")
        .select("hash, affiliate_code")
        .eq("id", order.offer_id)
        .maybeSingle();
      offerHash = offerData?.hash || "";
      affiliateCode = offerData?.affiliate_code || "";
    }
    // Fallback: read affiliate_id from integration config
    if (!affiliateCode) {
      const { data: logzzInteg } = await admin
        .from("integrations")
        .select("config")
        .eq("user_id", order.user_id)
        .eq("type", "logzz")
        .maybeSingle();
      affiliateCode = (logzzInteg?.config as any)?.affiliate_id || "";
    }

    // 6. Build payload
    const logzzPayload: Record<string, unknown> = {
      external_id: order.id,
      full_name: order.client_name,
      phone: (() => { const raw = (order.client_phone || "").replace(/\D/g, ""); return raw.startsWith("55") ? raw : `55${raw}`; })(),
      customer_document: (order.client_document || "").replace(/\D/g, ""),
      postal_code: (order.client_zip_code || "").replace(/\D/g, ""),
      street: order.client_address || "",
      neighborhood: order.client_address_district || "",
      city: order.client_address_city || "",
      state: (order.client_address_state || "").toLowerCase(),
      house_number: order.client_address_number || "",
      complement: order.client_address_comp || "",
      delivery_date: finalDeliveryDate,
      offer: offerHash,
      affiliate_email: order.affiliate_email || "",
      ...(affiliateCode ? { affiliate_code: affiliateCode } : {}),
    };

    // Save affiliate_code on order for traceability
    if (affiliateCode && !order.affiliate_code) {
      await admin.from("orders").update({ affiliate_code: affiliateCode }).eq("id", order_id);
    }

    // 7. Fetch order bumps & variations
    if (order.offer_id) {
      const { data: orderBumps } = await admin
        .from("order_bumps")
        .select("hash, product_id")
        .eq("offer_id", order.offer_id)
        .eq("is_active", true);

      if (orderBumps && orderBumps.length > 0) {
        const bumpsPayload: any[] = [];
        for (const bump of orderBumps) {
          if (!bump.hash || bump.hash.trim() === "") continue;
          const bumpEntry: any = { hash: bump.hash };
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
          logzzPayload.variations = mainVars.map((v: any) => ({ hash: v.hash, quantity: 1 }));
        }
      }
    }

    console.log("[logzz-create-order] Payload:", JSON.stringify(logzzPayload));

    // 8. Send to Logzz
    let { status: resStatus, body: resBody } = await sendToLogzz(webhookUrl, logzzPayload, bearerToken);
    console.log("[logzz-create-order] Response:", resStatus, resBody.substring(0, 500));

    // 8.5 RETRY on 422 with date error — recalculate to D+3 and try once more
    if (resStatus === 422) {
      const lower = resBody.toLowerCase();
      if (lower.includes("delivery_date") || lower.includes("data") || lower.includes("date")) {
        const retryDate = getNextBusinessDate(3);
        console.log(`[logzz-create-order] 422 date error detected → retrying with ${retryDate}`);
        logzzPayload.delivery_date = retryDate;
        finalDeliveryDate = retryDate;
        await admin.from("orders").update({ delivery_date: retryDate }).eq("id", order_id);

        const retry = await sendToLogzz(webhookUrl, logzzPayload, bearerToken);
        resStatus = retry.status;
        resBody = retry.body;
        console.log("[logzz-create-order] Retry response:", resStatus, resBody.substring(0, 500));
      }
    }

    // 9. Process result
    if (resStatus >= 200 && resStatus < 300) {
      let logzzOrderId: string | null = null;
      try {
        const parsed = JSON.parse(resBody);
        logzzOrderId = parsed?.data?.id || parsed?.id || parsed?.order_id
          || parsed?.data?.order_id || parsed?.data?.external_id || null;
        if (typeof logzzOrderId === "number") logzzOrderId = String(logzzOrderId);
        if (!logzzOrderId) {
          console.warn("[logzz-create-order] No order ID found in response. Full body:", resBody.substring(0, 300));
        }
      } catch { /* non-JSON ok */ }

      const prevStatus = order.status;
      await admin.from("orders").update({
        status: "Agendado",
        logzz_order_id: logzzOrderId,
        updated_at: new Date().toISOString(),
      }).eq("id", order_id);

      await admin.from("order_status_history").insert({
        order_id: order_id,
        from_status: prevStatus,
        to_status: "Agendado",
        source: "logzz_create_order",
        raw_payload: { webhook_url: webhookUrl, logzz_status: resStatus, logzz_body: resBody.substring(0, 500) },
      });

      console.log("[logzz-create-order] SUCCESS! logzz_order_id:", logzzOrderId);

      // Trigger flow
      try {
        const triggerRes = await fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ userId: effectiveUserId, orderId: order_id, newStatus: "Agendado", triggerEvent: "order_status_changed" }),
        });
        const triggerData = await triggerRes.json();
        console.log("[logzz-create-order] trigger-flow result:", JSON.stringify(triggerData));
      } catch (triggerErr: any) {
        console.warn("[logzz-create-order] trigger-flow error (non-blocking):", triggerErr.message);
      }

      return new Response(
        JSON.stringify({ success: true, logzz_order_id: logzzOrderId, logzz_status: resStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("[logzz-create-order] FAILED:", resStatus, resBody.substring(0, 300));

      let errorMsg = resBody.substring(0, 500);
      try { const parsed = JSON.parse(resBody); errorMsg = parsed?.message || parsed?.error || errorMsg; } catch { /* keep raw */ }

      await admin.from("order_status_history").insert({
        order_id: order_id,
        from_status: order.status,
        to_status: "logzz_error",
        source: "logzz_create_order",
        raw_payload: { webhook_url: webhookUrl, logzz_status: resStatus, logzz_error: errorMsg, logzz_body: resBody.substring(0, 500) },
      });

      return new Response(
        JSON.stringify({ success: false, logzz_status: resStatus, logzz_error: errorMsg, logzz_response: resBody.substring(0, 1000), webhook_url: webhookUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
