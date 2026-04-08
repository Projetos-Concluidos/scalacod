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

    const now = new Date();
    const currentHour = now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });

    console.log(`[process-remarketing] Running at ${now.toISOString()} BRT=${currentHour}`);

    // 1. Fetch all active campaigns
    const { data: campaigns, error: campError } = await supabase
      .from("remarketing_campaigns")
      .select("*, remarketing_steps(*)")
      .eq("is_active", true);

    if (campError) {
      console.error("[process-remarketing] Error fetching campaigns:", campError.message);
      throw campError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log("[process-remarketing] No active campaigns");
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;

    for (const campaign of campaigns) {
      const steps = (campaign.remarketing_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);
      if (steps.length === 0) continue;

      // 2. Fetch active enrollments for this campaign
      const { data: enrollments } = await supabase
        .from("remarketing_enrollments")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "active");

      if (!enrollments || enrollments.length === 0) continue;

      for (const enrollment of enrollments) {
        totalProcessed++;
        const currentStepIdx = enrollment.current_step;
        const nextStep = steps[currentStepIdx];

        if (!nextStep) {
          // All steps completed
          await supabase.from("remarketing_enrollments")
            .update({ status: "completed" })
            .eq("id", enrollment.id);
          continue;
        }

        // Calculate when this step should fire
        const enrolledAt = new Date(enrollment.enrolled_at);
        const targetDate = new Date(enrolledAt);
        targetDate.setDate(targetDate.getDate() + nextStep.delay_days);

        // Check if today is the target day
        const todayStr = now.toISOString().slice(0, 10);
        const targetStr = targetDate.toISOString().slice(0, 10);

        if (todayStr < targetStr) continue; // Not yet
        
        // Check if current hour matches send_hour (within 30 min window)
        const [stepH, stepM] = nextStep.send_hour.split(":").map(Number);
        const [curH, curM] = currentHour.split(":").map(Number);
        const stepMinutes = stepH * 60 + stepM;
        const curMinutes = curH * 60 + curM;

        if (curMinutes < stepMinutes || curMinutes > stepMinutes + 30) continue;

        // 3. Safety check: is the order still frustrated?
        const { data: order } = await supabase
          .from("orders")
          .select("id, status, client_name, client_phone, order_final_price, products, logistics_type, checkout_id, order_number")
          .eq("id", enrollment.order_id)
          .single();

        if (!order) {
          await supabase.from("remarketing_enrollments").update({ status: "cancelled" }).eq("id", enrollment.id);
          totalSkipped++;
          continue;
        }

        const lowerStatus = (order.status || "").toLowerCase();
        const isFrustrated = lowerStatus.includes("frustrad") || lowerStatus.includes("cancelad") || lowerStatus.includes("devolvid");

        if (!isFrustrated) {
          // Order recovered or changed - mark as converted
          await supabase.from("remarketing_enrollments")
            .update({
              status: "converted",
              converted_at: new Date().toISOString(),
            })
            .eq("id", enrollment.id);

          // Update campaign stats
          await supabase.from("remarketing_campaigns")
            .update({
              total_converted: (campaign.total_converted || 0) + 1,
              total_revenue_recovered: (campaign.total_revenue_recovered || 0) + Number(order.order_final_price || 0),
            })
            .eq("id", campaign.id);

          totalSkipped++;
          console.log(`[process-remarketing] Order ${order.order_number} recovered — marking as converted`);
          continue;
        }

        // 4. Build message with variable interpolation
        let message = nextStep.message_template || "";
        const productName = (() => {
          try {
            const prods = order.products as any;
            if (Array.isArray(prods) && prods.length > 0) return prods[0]?.name || "seu produto";
            if (prods?.name) return prods.name;
          } catch {}
          return "seu produto";
        })();

        // Resolve checkout link
        let checkoutLink = "";
        const checkoutIdToUse = campaign.checkout_id || order.checkout_id;
        if (checkoutIdToUse) {
          const { data: checkout } = await supabase
            .from("checkouts")
            .select("slug")
            .eq("id", checkoutIdToUse)
            .single();
          if (checkout?.slug) {
            checkoutLink = `https://scalaninja.lovable.app/c/${checkout.slug}`;
          }
        }

        const discountVal = campaign.discount_enabled ? nextStep.discount_value : 0;
        const discountLabel = discountVal > 0
          ? (campaign.discount_type === "percentage" ? `${discountVal}%` : `R$${discountVal}`)
          : "";
        const couponCode = discountVal > 0 ? `NINJA${enrollment.order_id.slice(0, 6).toUpperCase()}` : "";

        message = message
          .replace(/\{\{cliente_nome\}\}/g, order.client_name || "")
          .replace(/\{\{produto\}\}/g, productName)
          .replace(/\{\{checkout_link\}\}/g, checkoutLink)
          .replace(/\{\{cupom\}\}/g, couponCode)
          .replace(/\{\{desconto_valor\}\}/g, discountLabel)
          .replace(/\{\{valor_pedido\}\}/g, String(order.order_final_price || "0"));

        // 5. Insert into message_queue
        const { error: queueError } = await supabase.from("message_queue").insert({
          user_id: enrollment.user_id,
          phone: order.client_phone,
          message,
          order_id: order.id,
          status: "pending",
          process_after: new Date().toISOString(),
        });

        if (queueError) {
          console.error(`[process-remarketing] Queue error for enrollment ${enrollment.id}:`, queueError.message);
          continue;
        }

        // 6. Advance step
        await supabase.from("remarketing_enrollments")
          .update({ current_step: currentStepIdx + 1 })
          .eq("id", enrollment.id);

        totalSent++;
        console.log(`[process-remarketing] Sent step ${currentStepIdx + 1} (D${nextStep.delay_days}) for order ${order.order_number}`);
      }
    }

    console.log(`[process-remarketing] Done. Processed=${totalProcessed} Sent=${totalSent} Skipped=${totalSkipped}`);

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed, sent: totalSent, skipped: totalSkipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[process-remarketing] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
