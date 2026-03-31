const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um gerador de fluxos de automação WhatsApp para e-commerce COD (Cash on Delivery).
Dado um prompt do usuário, gere um JSON com a estrutura de um fluxo de automação.

Responda APENAS com JSON válido, sem markdown, sem explicação.

O JSON deve ter:
{
  "name": "Nome do Fluxo",
  "trigger_event": "pedido_criado" | "pedido_cancelado" | "pedido_entregue" | "pedido_agendado",
  "flow_type": "cod" | "oficial",
  "nodes": [
    { "id": "node_0", "position": {"x": 250, "y": 50}, "data": {"label": "🚀 Início", "type": "start"} },
    { "id": "node_1", "position": {"x": 250, "y": 180}, "data": {"label": "📩 Mensagem", "type": "message", "content": "Texto da mensagem com {{nome}} e {{pedido}}"} },
    { "id": "node_2", "position": {"x": 250, "y": 310}, "data": {"label": "⏳ Aguardar 1h", "type": "delay", "delay_minutes": 60} }
  ],
  "edges": [
    { "id": "e_0_1", "source": "node_0", "target": "node_1", "animated": true },
    { "id": "e_1_2", "source": "node_1", "target": "node_2", "animated": true }
  ]
}

Tipos de nós disponíveis: start, message, delay, condition, audio, image, button, list.
Variáveis: {{nome}}, {{telefone}}, {{pedido}}, {{produto}}, {{valor}}, {{rastreio}}, {{data_entrega}}.
Gere entre 4 e 8 nós. Posicione verticalmente com y incrementando em 130px.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const flowData = JSON.parse(content);

    // Add styling to nodes
    const startStyle = {
      background: "hsl(190 100% 50% / 0.15)",
      border: "1px solid hsl(190 100% 50% / 0.3)",
      borderRadius: 12, padding: 12,
      color: "hsl(190 100% 50%)", fontWeight: 600, fontSize: 13,
    };
    const nodeStyle = {
      background: "hsl(240 20% 7%)",
      border: "1px solid hsl(190 100% 50% / 0.2)",
      borderRadius: 12, padding: 12,
      color: "hsl(240 20% 97%)", fontSize: 13, minWidth: 200,
    };

    if (flowData.nodes) {
      flowData.nodes = flowData.nodes.map((n: any) => ({
        ...n,
        style: n.data?.type === "start" ? startStyle : nodeStyle,
      }));
    }
    if (flowData.edges) {
      flowData.edges = flowData.edges.map((e: any) => ({
        ...e,
        style: { stroke: "hsl(190 100% 50%)" },
      }));
    }

    flowData.node_count = flowData.nodes?.length || 0;
    flowData.message_count = flowData.nodes?.filter((n: any) => n.data?.type === "message").length || 0;
    flowData.is_official = false;

    return new Response(JSON.stringify(flowData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
