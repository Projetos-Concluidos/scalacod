import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    for (const msg of messages) {
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
          // Still no instance — re-queue with backoff
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
            // Exponential backoff: 5min, 15min, 45min
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

        // Success
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
        const newRetry = msg.retry_count + 1;
        if (newRetry >= msg.max_retries) {
          await supabase
            .from("message_queue")
            .update({
              status: "failed",
              retry_count: newRetry,
              error_message: e.message,
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
              error_message: e.message,
            })
            .eq("id", msg.id);
        }
        console.error(`[process-message-queue] Error msg=${msg.id}:`, e.message);
      }
    }

    // Cleanup old records (sent/failed older than 7 days)
    await supabase
      .from("message_queue")
      .delete()
      .in("status", ["sent", "failed"])
      .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    return new Response(
      JSON.stringify({ processed: messages.length, sent, failed }),
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
