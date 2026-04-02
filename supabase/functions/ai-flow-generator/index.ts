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
    const { prompt, provider } = await req.json();
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

    const selectedProvider = provider || "evolution";

    const systemPrompt = `Você é um gerador de fluxos de automação WhatsApp para e-commerce COD (Cash on Delivery).
Dado um prompt do usuário, gere um JSON com a estrutura de um fluxo de automação.

Responda APENAS com JSON válido, sem markdown, sem explicação.

O provedor selecionado é: ${selectedProvider}

## Tipos de nó disponíveis:

1. **trigger** - Nó de início. Dispara quando um evento ocorre.
   data: { keyword: "pedido_criado"|"pedido_cancelado"|"pedido_entregue"|"pedido_agendado", matchType: "exact" }

2. **message** - Mensagem de texto, imagem, botões, etc.
   data: {
     text: "Mensagem com *negrito* e {{variáveis}}",
     messageType: "text"|"buttons"|"image"|"video"|"document"|"audio"|"list"|"template",
     headerText: "Cabeçalho opcional",
     footerText: "Rodapé opcional",
     buttons: [{ id: "btn-id", text: "Texto do botão", type: "reply" }],
     buttonConnections: { "btn-id": "node-id-destino" },
     waitForResponse: "none"|"standard"|"smart",
     smartWaitFields: "Campo 1, Campo 2",
     remarketingConnection: "remarketing-node-id"
   }

3. **action** - Executa uma ação no sistema.
   data: { actionType: "update_order_status", orderStatus: "CONFIRMED_BY_CUSTOMER"|"NEEDS_CORRECTION"|"SHIPPED"|"DELIVERED"|"CANCELLED" }

4. **remarketing** - Sequência de follow-ups automáticos quando o cliente não responde.
   data: {
     steps: [
       { id: "rmk-1", delay: 2, unit: "hours", message: "Mensagem de follow-up 1" },
       { id: "rmk-2", delay: 6, unit: "hours", message: "Mensagem de follow-up 2" },
       { id: "rmk-3", delay: 1, unit: "days", message: "Última tentativa" }
     ]
   }

5. **delay** - Pausa antes do próximo nó.
   data: { delay_minutes: 60, delayUnit: "minutes"|"hours"|"days" }

6. **condition** - Condição if/else.
   data: { condition: "expressão" }

7. **end** - Encerra o fluxo.

## Estrutura do JSON de saída:

{
  "name": "Nome do Fluxo",
  "trigger_event": "pedido_criado",
  "flow_type": "cod",
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "label": "Pedido criado",
      "position": { "x": 400, "y": 40 },
      "data": { "keyword": "pedido_criado", "matchType": "exact" },
      "connections": ["msg-1"]
    }
  ],
  "edges": [
    { "id": "e-trigger-msg", "source": "trigger-1", "target": "msg-1", "animated": true }
  ]
}

## Regras:
- Gere entre 4 e 10 nós
- Posicione verticalmente com y incrementando em 160-200px
- Para mensagens com botões, cada botão deve ter um "buttonConnections" mapeando o id do botão para o id do nó destino
- Para mensagens que precisam de remarketing, adicione "remarketingConnection" apontando para o nó de remarketing
- Use IDs descritivos como "trigger-1", "msg-confirm", "action-status", "remarketing-1"
- Para botões de "Tudo certo" → conectar a ação de confirmação
- Para botões de "Corrigir dados" → conectar a mensagem de correção com waitForResponse: "smart"
- Variáveis: {{1}} = nome, {{2}} = produto, {{3}} = produto detalhado, {{4}} = valor, {{5}} = endereço, {{6}} = previsão, {{resposta_cliente}} = resposta anterior
- Use emojis nos textos para tornar mais amigável
- Inclua remarketings com 2-3 etapas (2h, 6h, 1 dia) quando fizer sentido`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Configurações." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const flowData = JSON.parse(content);

    // Add styling to nodes
    const triggerStyle = {
      background: "hsl(160 84% 39% / 0.15)",
      border: "1px solid hsl(160 84% 39% / 0.3)",
      borderRadius: 12, padding: 12,
      color: "hsl(160 84% 39%)", fontWeight: 600, fontSize: 13,
    };
    const actionStyle = {
      background: "hsl(217 91% 60% / 0.1)",
      border: "1px solid hsl(217 91% 60% / 0.3)",
      borderRadius: 12, padding: 12,
      color: "hsl(217 91% 60%)", fontWeight: 600, fontSize: 13,
    };
    const remarketingStyle = {
      background: "hsl(38 92% 50% / 0.1)",
      border: "1px solid hsl(38 92% 50% / 0.3)",
      borderRadius: 12, padding: 12,
      color: "hsl(38 92% 50%)", fontWeight: 600, fontSize: 13,
    };
    const nodeStyle = {
      background: "#FFFFFF",
      border: "1px solid hsl(160 84% 39% / 0.2)",
      borderRadius: 12, padding: 12,
      color: "#111827", fontSize: 13, minWidth: 200,
    };

    if (flowData.nodes) {
      flowData.nodes = flowData.nodes.map((n: any) => ({
        ...n,
        style: n.type === "trigger" ? triggerStyle
          : n.type === "action" ? actionStyle
          : n.type === "remarketing" ? remarketingStyle
          : nodeStyle,
      }));
    }
    if (flowData.edges) {
      flowData.edges = flowData.edges.map((e: any) => ({
        ...e,
        style: { stroke: "hsl(160 84% 39%)" },
      }));
    }

    flowData.node_count = flowData.nodes?.length || 0;
    flowData.message_count = flowData.nodes?.filter((n: any) => n.type === "message" || n.data?.type === "message").length || 0;
    flowData.is_official = selectedProvider === "official";

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
