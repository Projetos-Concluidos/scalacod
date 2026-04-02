import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FLOW_TEMPLATES = [
  {
    name: "✅ Pedido Confirmado",
    description: "Notifica o cliente quando o pedido é confirmado",
    trigger_event: "order_status_changed",
    trigger_status: "Confirmado",
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
          content: "✅ *Pedido Confirmado!*\n\nOlá, {{cliente_nome}}! 🥷\n\nSeu pedido *#{{pedido_numero}}* foi confirmado com sucesso!\n\n📦 *Produto:* {{produto_nome}}\n💰 *Valor:* R$ {{valor_total}}\n📅 *Entrega prevista:* {{data_entrega}}\n\n*Pagamento:* Você pagará ao entregador na hora da entrega (dinheiro, PIX ou cartão).\n\nAcompanhe o status pelo nosso painel. Qualquer dúvida, estamos aqui! 😊",
        },
      },
    ],
    edges: [],
  },
  {
    name: "📅 Data de Entrega Agendada",
    description: "Notifica quando a entrega é agendada",
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
          content: "📅 *Entrega Agendada!*\n\nOlá, {{cliente_nome}}!\n\nSua entrega foi *agendada com sucesso*!\n\n📦 *Produto:* {{produto_nome}}\n📅 *Data de entrega:* {{data_entrega}}\n📍 *Endereço:* {{endereco_completo}}\n\n💡 *Dica:* Mantenha-se disponível no endereço na data combinada.\n\n💰 *Lembre-se:* Tenha o valor de *R$ {{valor_total}}* pronto para o pagamento na entrega.\n\n_Pedido #{{pedido_numero}}_",
        },
      },
    ],
    edges: [],
  },
  {
    name: "🔔 Lembrete Dia Anterior",
    description: "Envia lembrete automático no dia anterior à entrega",
    trigger_event: "scheduled_reminder",
    trigger_status: "reminder_d1",
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
          content: "🔔 *Lembrete: Entrega AMANHÃ!*\n\nOlá, {{cliente_nome}}!\n\nEste é um lembrete de que seu pedido será entregue *AMANHÃ* ({{data_entrega}})!\n\n📦 {{produto_nome}}\n💰 Separe *R$ {{valor_total}}* para o pagamento\n\n✅ Para facilitar:\n• Esteja em casa no período do dia\n• Tenha o dinheiro ou PIX disponível\n• Confira o endereço: {{endereco_completo}}\n\nNos vemos amanhã! 🚚",
        },
      },
    ],
    edges: [],
  },
  {
    name: "🚚 Saiu para Entrega",
    description: "Notifica quando o pedido sai para entrega",
    trigger_event: "order_status_changed",
    trigger_status: "Em Rota",
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
          content: "🚚 *Seu pedido saiu para entrega!*\n\nOlá, {{cliente_nome}}! Boa notícia! 🎉\n\nSeu pedido *#{{pedido_numero}}* está *A CAMINHO* agora!\n\n📦 *Produto:* {{produto_nome}}\n💰 *Valor para pagamento:* R$ {{valor_total}}\n\n⚠️ *IMPORTANTE:*\n• Esteja disponível no endereço\n• Tenha o pagamento pronto\n• O entregador chegará em breve\n\n📍 *Endereço:* {{endereco_completo}}\n\n_Qualquer problema? Responda esta mensagem._",
        },
      },
    ],
    edges: [],
  },
  {
    name: "🎉 Pedido Entregue + Pós-Venda",
    description: "Confirma entrega e envia pesquisa de satisfação 24h depois",
    trigger_event: "order_status_changed",
    trigger_status: "Entregue",
    is_official: true,
    is_active: true,
    flow_type: "cod",
    node_count: 3,
    message_count: 2,
    nodes: [
      {
        id: "node-1",
        type: "text",
        position: { x: 250, y: 100 },
        data: {
          content: "🎉 *Pedido Entregue com Sucesso!*\n\nOlá, {{cliente_nome}}!\n\nSeu pedido *#{{pedido_numero}}* foi entregue! Esperamos que tenha gostado! 😊\n\n📦 *{{produto_nome}}*",
        },
      },
      {
        id: "node-2",
        type: "delay",
        position: { x: 250, y: 280 },
        data: { unit: "hours", value: 24 },
      },
      {
        id: "node-3",
        type: "text",
        position: { x: 250, y: 440 },
        data: {
          content: "⭐ *Como foi sua experiência?*\n\nOlá, {{cliente_nome}}!\n\nJá se passou um dia desde que você recebeu {{produto_nome}}.\n\nGostaríamos muito de saber sua opinião!\n\n1️⃣ Ótimo — adorei!\n2️⃣ Bom — gostei\n3️⃣ Regular — poderia melhorar\n4️⃣ Ruim — tive problemas\n\n_Responda com o número da sua avaliação._ 🙏",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3" },
    ],
  },
  {
    name: "😔 Tentativa Frustrada",
    description: "Notifica quando a entrega não foi concluída",
    trigger_event: "order_status_changed",
    trigger_status: "Frustrado",
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
          content: "😔 *Não conseguimos entregar seu pedido*\n\nOlá, {{cliente_nome}}!\n\nInfelizmente houve uma *dificuldade na entrega* do seu pedido *#{{pedido_numero}}*.\n\nNão se preocupe! Vamos reagendar para você. 📅\n\n*O que aconteceu?* O entregador foi ao endereço mas não conseguiu concluir a entrega.\n\n*O que fazer agora?*\nResponda esta mensagem com o melhor horário para reagendar sua entrega.\n\nSeu pedido está seguro e iremos entregar! 🙏",
        },
      },
    ],
    edges: [],
  },
  {
    name: "🔄 Reagendamento",
    description: "Notifica quando o pedido é reagendado",
    trigger_event: "order_status_changed",
    trigger_status: "Reagendar",
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
          content: "🔄 *Reagendamento de Entrega*\n\nOlá, {{cliente_nome}}!\n\nSeu pedido *#{{pedido_numero}}* foi reagendado!\n\n📅 *Nova data de entrega:* {{data_entrega}}\n📦 *Produto:* {{produto_nome}}\n💰 *Valor:* R$ {{valor_total}}\n📍 *Endereço:* {{endereco_completo}}\n\nDessa vez tudo certo! Estaremos lá na data combinada. 🚚\n\n_Precisa alterar algo? Responda esta mensagem._",
        },
      },
    ],
    edges: [],
  },
  {
    name: "❌ Pedido Cancelado",
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
          content: "❌ *Pedido Cancelado*\n\nOlá, {{cliente_nome}},\n\nInfelizmente seu pedido *#{{pedido_numero}}* foi *cancelado*.\n\n📦 *Produto:* {{produto_nome}}\n\nSe o cancelamento foi um engano ou você gostaria de fazer um novo pedido, entre em contato conosco ou acesse novamente o link de compra.\n\nLamentamos o inconveniente e esperamos atendê-lo em breve! 🙏\n\n_— Equipe {{loja_nome}}_",
        },
      },
    ],
    edges: [],
  },
];

/* ─── COINZZ FLOW TEMPLATES ─── */
const COINZZ_FLOW_TEMPLATES = [
  {
    name: "💳 Pagamento Aprovado (Coinzz)",
    description: "Notifica o cliente quando o pagamento online é aprovado",
    trigger_event: "order_status_changed",
    trigger_status: "Aprovado",
    is_official: true,
    is_active: true,
    flow_type: "coinzz",
    node_count: 1,
    message_count: 1,
    nodes: [
      {
        id: "node-1",
        type: "text",
        position: { x: 250, y: 100 },
        data: {
          content: "✅ *Pagamento Aprovado!*\n\nOlá, {{cliente_nome}}! 🎉\n\nSeu pagamento do pedido *#{{pedido_numero}}* foi *aprovado com sucesso*!\n\n📦 *Produto:* {{produto_nome}}\n💰 *Valor:* R$ {{valor_total}}\n💳 *Método:* {{metodo_pagamento}}\n\nSeu pedido já está sendo preparado para envio. Você receberá o código de rastreio assim que for despachado! 🚚\n\n_— Equipe {{loja_nome}}_",
        },
      },
    ],
    edges: [],
  },
  {
    name: "⏳ Pagamento Pendente (Coinzz)",
    description: "Notifica quando o pagamento está aguardando confirmação",
    trigger_event: "order_status_changed",
    trigger_status: "Aguardando",
    is_official: true,
    is_active: true,
    flow_type: "coinzz",
    node_count: 2,
    message_count: 2,
    nodes: [
      {
        id: "node-1",
        type: "text",
        position: { x: 250, y: 100 },
        data: {
          content: "⏳ *Pedido Recebido!*\n\nOlá, {{cliente_nome}}!\n\nRecebemos seu pedido *#{{pedido_numero}}*! 🎊\n\n📦 *Produto:* {{produto_nome}}\n💰 *Valor:* R$ {{valor_total}}\n\n⚠️ *Seu pagamento está sendo processado.* Assim que for confirmado, iniciaremos a preparação do envio.\n\n_Se pagou via PIX ou Boleto, aguarde alguns minutos para a confirmação._",
        },
      },
      {
        id: "node-2",
        type: "delay",
        position: { x: 250, y: 300 },
        data: { unit: "hours", value: 24 },
      },
      {
        id: "node-3",
        type: "text",
        position: { x: 250, y: 460 },
        data: {
          content: "🔔 *Lembrete de Pagamento*\n\nOlá, {{cliente_nome}}!\n\nNotamos que o pagamento do pedido *#{{pedido_numero}}* ainda não foi confirmado.\n\n💰 *Valor:* R$ {{valor_total}}\n\nSe já realizou o pagamento, aguarde a confirmação. Caso contrário, finalize para garantir seu produto! 😊\n\n_Precisa de ajuda? Responda esta mensagem._",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3" },
    ],
  },
  {
    name: "📦 Pedido Em Separação (Coinzz)",
    description: "Notifica quando o pedido está sendo preparado",
    trigger_event: "order_status_changed",
    trigger_status: "Em Separação",
    is_official: true,
    is_active: true,
    flow_type: "coinzz",
    node_count: 1,
    message_count: 1,
    nodes: [
      {
        id: "node-1",
        type: "text",
        position: { x: 250, y: 100 },
        data: {
          content: "📦 *Pedido em Separação!*\n\nOlá, {{cliente_nome}}!\n\nSeu pedido *#{{pedido_numero}}* está sendo *preparado para envio*! 🏭\n\n📦 *Produto:* {{produto_nome}}\n\nEm breve você receberá o código de rastreio. Fique atento! 👀\n\n_— Equipe {{loja_nome}}_",
        },
      },
    ],
    edges: [],
  },
  {
    name: "🚚 Pedido Enviado (Coinzz)",
    description: "Notifica com código de rastreio quando despachado",
    trigger_event: "order_status_changed",
    trigger_status: "Em Rota",
    is_official: true,
    is_active: true,
    flow_type: "coinzz",
    node_count: 1,
    message_count: 1,
    nodes: [
      {
        id: "node-1",
        type: "text",
        position: { x: 250, y: 100 },
        data: {
          content: "🚚 *Pedido Enviado!*\n\nOlá, {{cliente_nome}}! 🎉\n\nSeu pedido *#{{pedido_numero}}* foi *despachado*!\n\n📦 *Produto:* {{produto_nome}}\n📮 *Rastreio:* {{codigo_rastreio}}\n🔗 *Rastrear:* https://rastreamento.correios.com.br/app/index.php\n\n📍 *Endereço de entrega:*\n{{endereco_completo}}\n\nAcompanhe pelo site dos Correios! 📬\n\n_— Equipe {{loja_nome}}_",
        },
      },
    ],
    edges: [],
  },
  {
    name: "🎉 Pedido Entregue (Coinzz)",
    description: "Confirma entrega e solicita avaliação",
    trigger_event: "order_status_changed",
    trigger_status: "Entregue",
    is_official: true,
    is_active: true,
    flow_type: "coinzz",
    node_count: 3,
    message_count: 2,
    nodes: [
      {
        id: "node-1",
        type: "text",
        position: { x: 250, y: 100 },
        data: {
          content: "🎉 *Pedido Entregue!*\n\nOlá, {{cliente_nome}}!\n\nSeu pedido *#{{pedido_numero}}* foi entregue com sucesso! 📬\n\n📦 *{{produto_nome}}*\n\nEsperamos que você ame o produto! 😍",
        },
      },
      {
        id: "node-2",
        type: "delay",
        position: { x: 250, y: 280 },
        data: { unit: "hours", value: 48 },
      },
      {
        id: "node-3",
        type: "text",
        position: { x: 250, y: 440 },
        data: {
          content: "⭐ *Sua opinião é importante!*\n\nOlá, {{cliente_nome}}!\n\nJá faz 2 dias que recebeu *{{produto_nome}}*.\n\nComo está sendo sua experiência?\n\n1️⃣ Amei! ❤️\n2️⃣ Gostei 👍\n3️⃣ Regular 😐\n4️⃣ Não gostei 👎\n\n_Responda com o número! Seu feedback nos ajuda a melhorar._ 🙏",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3" },
    ],
  },
  {
    name: "❌ Pagamento Rejeitado (Coinzz)",
    description: "Notifica quando o pagamento é rejeitado ou cancelado",
    trigger_event: "order_status_changed",
    trigger_status: "Frustrado",
    is_official: true,
    is_active: true,
    flow_type: "coinzz",
    node_count: 1,
    message_count: 1,
    nodes: [
      {
        id: "node-1",
        type: "text",
        position: { x: 250, y: 100 },
        data: {
          content: "❌ *Pagamento Não Aprovado*\n\nOlá, {{cliente_nome}},\n\nInfelizmente o pagamento do pedido *#{{pedido_numero}}* *não foi aprovado*.\n\n📦 *Produto:* {{produto_nome}}\n💰 *Valor:* R$ {{valor_total}}\n\n*Possíveis motivos:*\n• Saldo insuficiente\n• Dados do cartão incorretos\n• Limite excedido\n\nVocê pode tentar novamente com outro método de pagamento. Se precisar de ajuda, responda esta mensagem! 🙏\n\n_— Equipe {{loja_nome}}_",
        },
      },
    ],
    edges: [],
  },
];

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

    // Check request body for mode
    let body: any = {};
    try { body = await req.json(); } catch { /* no body = seed mode */ }

    const ALL_TEMPLATES = [...FLOW_TEMPLATES, ...COINZZ_FLOW_TEMPLATES];

    // Mode: list_templates — return templates without creating
    if (body.action === "list_templates") {
      return new Response(
        JSON.stringify({ templates: ALL_TEMPLATES }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode: use_template — create a single flow from template index
    if (body.action === "use_template" && typeof body.template_index === "number") {
      const tpl = FLOW_TEMPLATES[body.template_index];
      if (!tpl) {
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already has a flow with same trigger_status
      const { data: existing } = await supabase
        .from("flows")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("trigger_status", tpl.trigger_status)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Já existe um fluxo para o status "${tpl.trigger_status}": "${existing[0].name}"` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newFlow, error: insertErr } = await supabase
        .from("flows")
        .insert({ ...tpl, user_id: user.id })
        .select("id, name")
        .single();

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, flow: newFlow }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default mode: seed all templates for new users
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

    const flowsToInsert = FLOW_TEMPLATES.map((t) => ({ ...t, user_id: user.id }));
    const { error: insertError } = await supabase.from("flows").insert(flowsToInsert);

    if (insertError) {
      console.error("Error seeding flows:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, count: flowsToInsert.length }),
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
