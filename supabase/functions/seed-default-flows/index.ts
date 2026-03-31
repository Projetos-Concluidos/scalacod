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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has default flows
    const { data: existing } = await supabase
      .from("flows")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_official", true)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Fluxos padrão já existem" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const defaultFlows = [
      {
        user_id: user.id,
        name: "Pedido Feito (Oficial)",
        description: "Notifica o cliente quando um pedido é confirmado/agendado",
        trigger_event: "order_status_changed",
        trigger_status: "Agendado",
        is_official: true,
        is_active: true,
        flow_type: "cod",
        node_count: 1,
        message_count: 1,
        nodes: [
          {
            id: "node-1",
            type: "text",
            position: { x: 250, y: 100 },
            data: {
              content:
                "🎉 Olá {{cliente_nome}}! Seu pedido #{{pedido_numero}} foi confirmado!\n\n📦 Produto: {{produto_nome}}\n📅 Entrega prevista: {{data_entrega}}\n💰 Valor: {{valor_total}} (pague na entrega)\n\nAcompanhe pela ScalaNinja 🥷",
            },
          },
        ],
        edges: [],
      },
      {
        user_id: user.id,
        name: "Pós-Venda (Oficial)",
        description: "Envia pesquisa de satisfação 24h após entrega",
        trigger_event: "order_status_changed",
        trigger_status: "Entregue",
        is_official: true,
        is_active: true,
        flow_type: "cod",
        node_count: 2,
        message_count: 1,
        nodes: [
          {
            id: "node-1",
            type: "delay",
            position: { x: 250, y: 100 },
            data: { unit: "hours", value: 24 },
          },
          {
            id: "node-2",
            type: "text",
            position: { x: 250, y: 250 },
            data: {
              content:
                "😊 Olá {{cliente_nome}}! Seu pedido foi entregue ontem.\n\nEsperamos que tenha gostado! Avalie sua experiência:\n⭐ Ótimo\n👍 Bom\n😐 Regular\n\nSua opinião é muito importante para nós! 🥷",
            },
          },
        ],
        edges: [{ id: "e1-2", source: "node-1", target: "node-2" }],
      },
      {
        user_id: user.id,
        name: "Pedido Cancelado (Oficial)",
        description: "Notifica o cliente quando um pedido é cancelado",
        trigger_event: "order_status_changed",
        trigger_status: "Cancelado",
        is_official: true,
        is_active: true,
        flow_type: "cod",
        node_count: 1,
        message_count: 1,
        nodes: [
          {
            id: "node-1",
            type: "text",
            position: { x: 250, y: 100 },
            data: {
              content:
                "😔 Olá {{cliente_nome}}, infelizmente seu pedido #{{pedido_numero}} foi cancelado.\n\nSe desejar fazer um novo pedido ou tiver alguma dúvida, entre em contato conosco!\n\nAtenciosamente, {{loja_nome}} 🥷",
            },
          },
        ],
        edges: [],
      },
    ];

    const { error: insertError } = await supabase.from("flows").insert(defaultFlows);

    if (insertError) {
      console.error("Error seeding flows:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, count: defaultFlows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[seed-default-flows] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
