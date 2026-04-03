import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phone validation — detect fake/invalid numbers
const INVALID_PATTERNS = [
  /^(\d)\1{9,}$/,           // all same digit (99999999999, 11111111111)
  /^0{10,}$/,               // all zeros
  /^(12345678|87654321)/,   // sequential
];

function isInvalidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 10 || clean.length > 13) return true;
  const local = clean.startsWith("55") ? clean.slice(2) : clean;
  return INVALID_PATTERNS.some((p) => p.test(local));
}

// Non-retryable error patterns — fail immediately
const NON_RETRYABLE_PATTERNS = [
  "não encontrado no WhatsApp",
  "Número inválido",
  "not found on WhatsApp",
];

// Session-related error patterns — treat as provider issue, not contact issue
const SESSION_ERROR_PATTERNS = [
  "exists.*false",
  "Bad Request",
  "session",
  "ECONNREFUSED",
  "ECONNRESET",
];

function isNonRetryableError(msg: string): boolean {
  return NON_RETRYABLE_PATTERNS.some((s) => msg.includes(s));
}

function isSessionError(msg: string): boolean {
  return SESSION_ERROR_PATTERNS.some((s) => {
    try { return new RegExp(s, "i").test(msg); } catch { return msg.toLowerCase().includes(s.toLowerCase()); }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Fetch pending messages ready to process (up to 50 per run)
    const { data: messages, error: fetchErr } = await supabase
      .from("message_queue")
      .select("*")
      .eq("status", "pending")
      .lte("process_after", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchErr) {
      console.error("[process-message-queue] Fetch error:", fetchErr.message);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-message-queue] Processing ${messages.length} messages`);

    let sent = 0;
    let failed = 0;
    let consecutiveExistsFalse = 0; // Track consecutive "exists:false" failures
    const MAX_CONSECUTIVE_SESSION_FAILURES = 3; // If 3+ in a row fail with session errors, pause
    let sessionPaused = false;

    for (const msg of messages) {
      // If we detected a session problem, re-queue remaining messages instead of failing them
      if (sessionPaused) {
        const backoffMinutes = 10;
        const processAfter = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
        await supabase
          .from("message_queue")
          .update({
            status: "pending",
            process_after: processAfter,
            error_message: "Sessão Evolution instável — reagendado automaticamente",
          })
          .eq("id", msg.id);
        console.log(`[process-message-queue] SESSION_PAUSED re-queued msg=${msg.id}`);
        continue;
      }

      // Check for invalid/fake phone numbers first
      if (isInvalidPhone(msg.phone)) {
        console.log(`[process-message-queue] SKIP invalid phone="${msg.phone}" msg=${msg.id}`);
        await supabase
          .from("message_queue")
          .update({
            status: "failed",
            error_message: "Número inválido/fictício detectado",
          })
          .eq("id", msg.id);
        failed++;
        continue;
      }

      // Mark as processing
      await supabase
        .from("message_queue")
        .update({ status: "processing" })
        .eq("id", msg.id);

      try {
        // Check if user has a connected WhatsApp instance
        const { data: instance } = await supabase
          .from("whatsapp_instances")
          .select("id, provider, status")
          .eq("user_id", msg.user_id)
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();

        if (!instance) {
          const newRetry = msg.retry_count + 1;
          if (newRetry >= msg.max_retries) {
            await supabase
              .from("message_queue")
              .update({
                status: "failed",
                retry_count: newRetry,
                error_message: "Max retries reached — no WhatsApp instance connected",
              })
              .eq("id", msg.id);
            failed++;
            console.log(`[process-message-queue] FAILED (max retries) msg=${msg.id}`);
          } else {
            const backoffMinutes = 5 * Math.pow(3, newRetry - 1);
            const processAfter = new Date(
              Date.now() + backoffMinutes * 60 * 1000
            ).toISOString();

            await supabase
              .from("message_queue")
              .update({
                status: "pending",
                retry_count: newRetry,
                process_after: processAfter,
                error_message: `Retry ${newRetry}/${msg.max_retries} — no instance connected`,
              })
              .eq("id", msg.id);
            console.log(
              `[process-message-queue] Re-queued msg=${msg.id} retry=${newRetry} next=${processAfter}`
            );
          }
          continue;
        }

        // Instance available — send the message
        const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-message`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: msg.phone,
            content: msg.message,
            direct: true,
            userId: msg.user_id,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Send failed: ${res.status}`);
        }

        // Success — reset consecutive failure counter
        consecutiveExistsFalse = 0;

        await supabase
          .from("message_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", msg.id);
        sent++;
        console.log(`[process-message-queue] SENT msg=${msg.id}`);

        // Delay between sends to avoid rate limits
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        const errorMsg = e.message || "";

        // Non-retryable errors — fail immediately
        if (isNonRetryableError(errorMsg)) {
          await supabase
            .from("message_queue")
            .update({
              status: "failed",
              error_message: errorMsg,
            })
            .eq("id", msg.id);
          failed++;
          // Don't count non-retryable as session errors
          consecutiveExistsFalse = 0;
          console.log(`[process-message-queue] NON-RETRYABLE msg=${msg.id}: ${errorMsg}`);
          continue;
        }

        // Check if this looks like a session/provider problem
        if (isSessionError(errorMsg)) {
          consecutiveExistsFalse++;
          console.warn(`[process-message-queue] SESSION_ERROR #${consecutiveExistsFalse} msg=${msg.id}: ${errorMsg}`);

          if (consecutiveExistsFalse >= MAX_CONSECUTIVE_SESSION_FAILURES) {
            // This is likely a session problem, not individual contacts
            sessionPaused = true;
            console.error(`[process-message-queue] SESSION DEGRADED — pausing remaining sends. ${consecutiveExistsFalse} consecutive failures.`);

            // Re-queue this message instead of failing it
            const processAfter = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            await supabase
              .from("message_queue")
              .update({
                status: "pending",
                process_after: processAfter,
                error_message: `Sessão Evolution degradada — reagendado. Erro: ${errorMsg}`,
              })
              .eq("id", msg.id);
            continue;
          }
        }

        // Standard retry logic
        const newRetry = msg.retry_count + 1;
        if (newRetry >= msg.max_retries) {
          await supabase
            .from("message_queue")
            .update({
              status: "failed",
              retry_count: newRetry,
              error_message: errorMsg,
            })
            .eq("id", msg.id);
          failed++;
        } else {
          const backoffMinutes = 5 * Math.pow(3, newRetry - 1);
          const processAfter = new Date(
            Date.now() + backoffMinutes * 60 * 1000
          ).toISOString();
          await supabase
            .from("message_queue")
            .update({
              status: "pending",
              retry_count: newRetry,
              process_after: processAfter,
              error_message: errorMsg,
            })
            .eq("id", msg.id);
        }
        console.error(`[process-message-queue] Error msg=${msg.id}:`, errorMsg);
      }
    }

    // Cleanup old records (sent/failed older than 7 days)
    await supabase
      .from("message_queue")
      .delete()
      .in("status", ["sent", "failed"])
      .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    return new Response(
      JSON.stringify({ processed: messages.length, sent, failed, sessionPaused }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[process-message-queue] Fatal error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
