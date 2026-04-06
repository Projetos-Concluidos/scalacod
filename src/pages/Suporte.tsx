import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, ExternalLink, BookOpen, Lightbulb, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface TutorialStep {
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
}

interface TutorialSectionData {
  id: string;
  icon: string;
  label: string;
  title: string;
  steps?: TutorialStep[];
  content?: string;
  link?: string;
  linkLabel?: string;
}

const TUTORIAL_SECTIONS: TutorialSectionData[] = [
  {
    id: "inicio",
    icon: "🚀",
    label: "Primeiros Passos",
    title: "Como começar com o ScalaCOD — Guia Completo",
    steps: [
      {
        title: "1. Crie sua conta e faça login",
        description: "Acesse a página de cadastro, preencha seus dados (nome, email e senha) e confirme seu email. Após confirmar, faça login e você será redirecionado para o Dashboard.",
        link: "/register",
        linkLabel: "Criar conta →",
      },
      {
        title: "2. Conecte seu WhatsApp",
        description: "Vá em WhatsApp Cloud no menu lateral. Escolha seu provedor (YCloud, Meta ou Evolution API) e siga as instruções na tela. Sem o WhatsApp conectado, nenhuma mensagem automática será enviada aos seus clientes.",
        link: "/whatsapp-cloud",
        linkLabel: "Ir para WhatsApp Cloud →",
      },
      {
        title: "3. Configure a Logzz (Entrega COD)",
        description: "Em Configurações → Integrações, insira seu token da Logzz. Isso permite que o checkout calcule automaticamente se a Logzz atende o CEP do cliente e agende entregas COD (pagamento na entrega).",
        link: "/configuracoes",
        linkLabel: "Ir para Configurações →",
      },
      {
        title: "4. Configure o MercadoPago (Pagamento Online)",
        description: "Se quiser aceitar pagamentos online (PIX, Cartão, Boleto) para clientes que a Logzz não atende, vá em Configurações → MercadoPago e cole seu Access Token de Produção.",
        link: "/configuracoes",
        linkLabel: "Ir para Configurações →",
      },
      {
        title: "5. Crie seu primeiro Checkout",
        description: "Vá em Checkouts → + Novo Checkout. Importe uma oferta da Logzz, configure Order Bump (opcional), Pixel do Facebook (opcional) e personalize o design. Copie o link gerado e compartilhe nas suas campanhas.",
        link: "/checkouts",
        linkLabel: "Ir para Checkouts →",
      },
      {
        title: "6. Ative os Fluxos de Automação",
        description: "Vá em Fluxos e ative os fluxos prontos (templates) para cada status do pedido: confirmação, agendamento, separação, saída para entrega e entrega. Seus clientes receberão atualizações automáticas no WhatsApp!",
        link: "/fluxos",
        linkLabel: "Ir para Fluxos →",
      },
      {
        title: "7. Acompanhe seus pedidos no Kanban",
        description: "Todos os pedidos aparecem automaticamente no Kanban (Pedidos). Arraste entre colunas, use filtros avançados, exporte CSV e acompanhe cada etapa da entrega em tempo real.",
        link: "/pedidos",
        linkLabel: "Ir para Pedidos →",
      },
    ],
  },
  {
    id: "checkouts",
    icon: "🛒",
    label: "Checkouts",
    title: "Checkouts — Guia Completo de Criação e Gestão",
    content: `## O que é um Checkout?
Um checkout é a página de venda onde seu cliente finaliza a compra. O ScalaCOD cria checkouts inteligentes com detecção automática de CEP, cálculo de frete e integração nativa com Logzz e Coinzz.

## Criando um Checkout — Passo a Passo

### Passo 1: Produto
1. Clique em **+ Novo Checkout** na tela de Checkouts
2. No campo de busca, digite o nome do produto
3. O sistema busca automaticamente na sua conta Logzz
4. Selecione a oferta desejada — o preço e nome serão preenchidos

### Passo 2: Order Bump (Opcional)
1. Ative o toggle **Order Bump**
2. Busque o produto complementar na Logzz
3. Defina o preço promocional do bump
4. O bump aparecerá como uma oferta adicional antes do botão de compra

**💡 Dica:** Order Bumps aumentam o ticket médio em até 30%. Use produtos complementares de baixo custo (ex: capinha extra, creme adicional).

### Passo 3: Tracking (Pixel)
1. Cole seu **Pixel ID do Facebook** para rastreamento no navegador
2. Cole o **Token CAPI** para envio server-side (mais preciso, não é bloqueado por adblockers)
3. Cole o **Google Ads ID** para rastrear conversões de Google Ads
4. Cole o **Google Analytics ID** para análise de tráfego

**Eventos disparados automaticamente:**
- **PageView** — Quando o cliente acessa o checkout
- **InitiateCheckout** — Quando começa a preencher o formulário
- **AddPaymentInfo** — Quando preenche os dados de pagamento
- **Purchase** — Quando o pedido é finalizado

### Passo 4: Design
1. Personalize as cores do botão de compra
2. Altere textos e chamadas para ação
3. Visualize o preview em tempo real

## Como funciona o CEP Inteligente?
Quando o cliente digita o CEP no checkout:
- Se a **Logzz atende** o CEP → Modo COD ativado. Cliente escolhe data de entrega e paga na hora da entrega (dinheiro ou maquininha)
- Se a Logzz **não atende** → Modo Coinzz ativado. Cliente paga online (PIX, Cartão ou Boleto) e recebe pelos Correios

**⚠️ Importante:** Para o modo Coinzz funcionar, você precisa ter configurado o MercadoPago e a Coinzz nas Configurações.

## Gerenciando Checkouts
- **Ativar/Desativar:** Toggle no card do checkout para pausar vendas
- **Editar:** Clique no checkout para alterar qualquer configuração
- **Copiar Link:** Botão de copiar para compartilhar nas suas campanhas
- **Slug personalizado:** Cada checkout tem uma URL amigável (ex: /checkout/meu-produto)

## Perguntas Frequentes

**P: Posso ter vários checkouts para o mesmo produto?**
R: Sim! Crie checkouts diferentes com preços ou Order Bumps diferentes para testar qual converte melhor (teste A/B).

**P: O checkout funciona no celular?**
R: Sim, todos os checkouts são 100% responsivos e otimizados para mobile.

**P: Como rastrear qual campanha gerou a venda?**
R: Use parâmetros UTM no link (ex: ?utm_source=facebook&utm_campaign=oferta1). Os UTMs são salvos automaticamente em cada pedido.`,
    link: "/checkouts",
    linkLabel: "Abrir Checkouts →",
  },
  {
    id: "pedidos",
    icon: "📦",
    label: "Pedidos (Kanban)",
    title: "Pedidos (Kanban) — Gestão Completa de Pedidos",
    content: `## O Quadro Kanban
O Kanban é o painel central do ScalaCOD. Todos os pedidos são organizados em colunas por status, permitindo arrastar e soltar para reorganizar manualmente.

## Colunas de Status

### 🟡 Aguardando
Pedido recém-criado. O cliente preencheu o checkout mas o pagamento ainda não foi confirmado.
- **Indicador de tempo:** Mostra há quanto tempo o pedido está aguardando (ex: "há 2h", "há 18h")
- **Auto-cancelamento:** Após **24 horas** sem pagamento, o pedido é automaticamente movido para "Frustrado"

### 🟢 Confirmado
Pagamento confirmado (COD agendado ou pagamento online aprovado).

### 🔵 Agendado
Entrega agendada na Logzz. Aparece a data de entrega e o link do pedido na Logzz.

### 🟠 Em Separação
Produto está sendo preparado no estoque da Logzz.

### 🟣 Separado
Produto separado e pronto para despacho.

### 🚚 Em Rota
Produto saiu para entrega. O motorista está a caminho do cliente.

### ✅ Entregue
Entrega realizada com sucesso. Pagamento coletado (COD).

### 🔴 Frustrado
Tentativa de entrega falhou ou pedido cancelado automaticamente.

### 🔄 Reagendar
Cliente solicitou reagendamento. Aguardando nova data.

## Auto-Cancelamento 24h — Como Funciona
1. Quando um pedido fica com status "Aguardando" por mais de 24 horas
2. Uma Edge Function verifica automaticamente (via cron job)
3. O pedido é movido para "Frustrado" com motivo "Auto-cancelado: sem pagamento em 24h"
4. Um registro é criado no histórico de status (order_status_history)
5. Se houver um fluxo ativo para o trigger "Frustrado", a mensagem é enviada ao cliente

**💡 Dica:** Este mecanismo mantém seu Kanban limpo e evita acúmulo de pedidos abandonados.

## Filtros Avançados
Clique em **"Filtros Avançados"** na barra superior para filtrar por:
- **Data:** Selecione um período (de/até)
- **Cidade:** Filtre por cidade do cliente
- **Método de Pagamento:** PIX, Cartão, Boleto, COD
- **Plataforma:** Logzz, Coinzz ou ambos
- **Chips ativos:** Cada filtro ativo aparece como um chip que pode ser removido individualmente

## Exportar para CSV
1. Aplique os filtros desejados (opcional)
2. Clique no botão **"Exportar CSV"** no topo
3. O arquivo será baixado com: nome, telefone, status, valor, data, produto, ID Logzz

## Seleção em Lote
1. Clique no ícone de **"Seleção"** na barra de ferramentas
2. Marque os pedidos desejados (checkbox em cada card)
3. Escolha o novo status no dropdown
4. Confirme para mover todos de uma vez

## Detalhes do Pedido
Clique em qualquer pedido para abrir o modal com 4 abas:
- **Resumo:** Dados do cliente, produto, valor, datas
- **Logística:** Endereço completo, etiquetas A4/Térmica, link da Logzz
- **Financeiro:** Método de pagamento, taxa gateway, comissão afiliado
- **Timeline:** Histórico completo de mudanças de status com data/hora

## Link do Pedido na Logzz
Pedidos agendados na Logzz exibem automaticamente o link direto para a Logzz:
- URL: https://app.logzz.com.br/meu-pedido/{id_do_pedido}
- Clique para ver todos os detalhes na plataforma Logzz

## Etiquetas de Impressão
Na aba Logística do pedido:
- **A4:** Etiqueta formato padrão para impressora comum
- **Térmica:** Etiqueta para impressora térmica (ex: Zebra)

## Perguntas Frequentes

**P: Posso mover pedidos manualmente?**
R: Sim! Arraste o card para outra coluna ou use o dropdown de status no modal.

**P: Os status atualizam automaticamente?**
R: Sim! Via webhook da Logzz. Quando a Logzz atualiza o status, o Kanban reflete instantaneamente.

**P: O que acontece se eu mover manualmente para "Entregue"?**
R: O status será atualizado e o fluxo de "Entregue" será disparado (se ativo).`,
    link: "/pedidos",
    linkLabel: "Abrir Pedidos →",
  },
  {
    id: "conversas",
    icon: "💬",
    label: "Conversas",
    title: "Conversas — Inbox Unificado de WhatsApp",
    content: `## O que é o módulo Conversas?
É a caixa de entrada unificada de todas as mensagens enviadas e recebidas via WhatsApp. Mensagens automáticas dos fluxos, respostas de clientes e mensagens manuais — tudo aparece aqui organizado por contato.

## Interface — Entendendo a Tela

### Painel Esquerdo — Lista de Conversas
- Mostra todas as conversas ordenadas pela última mensagem
- **Busca:** Filtre por nome ou telefone do contato
- **Filtros de Status:** Todas, Abertas, Resolvidas, Arquivadas
- **Badge de contagem:** Cada filtro mostra quantas conversas tem
- **Indicador de não lidas:** Número azul no card da conversa

### Painel Central — Chat
- Histórico completo de mensagens com o contato
- Mensagens enviadas (você) aparecem à direita em verde
- Mensagens recebidas (cliente) aparecem à esquerda em cinza
- Cada mensagem mostra horário e status (enviada, entregue, lida)

### Painel Direito — Detalhes do Contato
- Nome, telefone e avatar do contato
- Botão de atribuição de agente
- Notas internas da equipe
- Labels/Tags do contato

## Janela de 24h — Regra do WhatsApp

**⚠️ Regra importante da API oficial do WhatsApp:**
O WhatsApp permite respostas livres apenas dentro de **24 horas** após a última mensagem do cliente.

### Como funciona no ScalaCOD:
1. Cliente envia uma mensagem → **Janela abre por 24h**
2. Dentro da janela → Você pode enviar texto livre, mídia, áudio
3. Após 24h → Campo de texto é **desabilitado** automaticamente
4. Para reabrir → Envie um **Template aprovado pela Meta**
5. **Indicador visual:** Um banner amarelo aparece mostrando quanto tempo resta da janela

**💡 Dica:** Responda rapidamente! Se a janela fechar, você precisará de um template aprovado para reabrir a conversa.

## Respostas Rápidas — Agilize o Atendimento

### O que são?
Mensagens pré-salvas que você pode inserir com um clique, sem precisar digitar toda vez.

### Criando uma Resposta Rápida
1. Clique no ícone **⇄** (resposta rápida) na barra de mensagem
2. Clique em **"Gerenciar Respostas Rápidas"**
3. Clique em **"+ Nova"**
4. Preencha:
   - **Atalho:** Ex: /obrigado, /rastreio, /prazo
   - **Conteúdo:** O texto completo da mensagem
5. Clique em **"Salvar"**

### Usando uma Resposta Rápida
1. Clique no ícone **⇄** na barra de mensagem
2. Selecione a resposta desejada
3. O texto é inserido no campo de mensagem
4. Edite se necessário e envie!

### Exemplos úteis:
- **/obrigado** → "Obrigado pelo seu pedido! Qualquer dúvida estamos à disposição 😊"
- **/rastreio** → "Olá! Seu pedido já está em separação e logo sairá para entrega. Fique tranquilo!"
- **/prazo** → "O prazo de entrega é de 3 a 7 dias úteis após a confirmação do pagamento."
- **/pix** → "Segue o QR Code do PIX para pagamento. Após confirmar, seu pedido será processado automaticamente!"

## Notas Internas — Comunicação da Equipe

### O que são?
Notas visíveis apenas para a equipe (o cliente NÃO vê). Perfeitas para registrar informações importantes sobre o atendimento.

### Como usar:
1. Abra uma conversa
2. Clique no ícone **📝** no painel lateral direito
3. Digite sua nota (ex: "Cliente pediu para trocar tamanho", "Aguardando retorno sobre endereço")
4. Clique em **"Adicionar Nota"**
5. A nota fica salva permanentemente no banco de dados

### Indicador visual:
- Conversas com notas mostram um **badge numérico** no card da lista
- Todas as notas são visíveis para qualquer membro da equipe

## Atribuição de Agente
1. Abra uma conversa
2. No painel lateral direito, clique em **"Atribuir Agente"**
3. Selecione o membro da equipe responsável
4. O nome do agente aparece no card da conversa na lista

**💡 Dica:** Use a atribuição para organizar o atendimento quando tiver mais de uma pessoa na equipe.

## Envio de Mídia
Clique no ícone de **📎 (clipe)** para enviar:
- **Imagens:** JPG, PNG, WebP (até 16MB)
- **Documentos:** PDF, DOC, XLS (até 16MB)
- **Áudios:** MP3, OGG, WAV (até 16MB)
- **Vídeos:** MP4, AVI (até 16MB)

## Status da Conversa
- **Aberta** — Conversa ativa, aguardando ação
- **Resolvida** — Atendimento concluído (clique no botão ✅)
- **Arquivada** — Conversa arquivada (sai da lista principal)

## Teste de Mensagem
1. Clique no ícone **🧪 (teste)** na barra superior
2. Digite o número de telefone (com DDD)
3. Escolha: enviar texto livre ou disparar um fluxo
4. Envie para testar sem afetar conversas reais

## Perguntas Frequentes

**P: As mensagens dos fluxos automáticos aparecem aqui?**
R: Sim! Toda mensagem enviada pelo ScalaCOD (fluxos, campanhas ou manual) aparece na conversa do contato.

**P: Posso responder fora do horário comercial?**
R: Sim, o horário comercial afeta apenas os fluxos automáticos. Respostas manuais podem ser enviadas a qualquer momento (respeitando a janela de 24h).

**P: Se dois agentes abrirem a mesma conversa, o que acontece?**
R: Ambos veem as mesmas mensagens em tempo real. Use a atribuição para evitar respostas duplicadas.`,
    link: "/conversas",
    linkLabel: "Abrir Conversas →",
  },
  {
    id: "fluxos",
    icon: "🤖",
    label: "Fluxos (Automações)",
    title: "Fluxos — Automações Inteligentes de WhatsApp",
    content: `## O que são Fluxos?
Fluxos são automações que enviam mensagens no WhatsApp automaticamente quando um evento ocorre (ex: pedido muda de status). Cada fluxo é um conjunto de nós conectados visualmente.

## Criando um Fluxo — Passo a Passo

### Método 1: Usando Templates Prontos (Recomendado)
1. Clique em **"Templates"** na tela de Fluxos
2. Escolha o template para o status desejado (ex: "Pedido Confirmado COD")
3. O fluxo é criado com nós pré-configurados
4. Edite as mensagens conforme sua necessidade
5. Ative o fluxo com o toggle

### Método 2: Criar do Zero
1. Clique em **"+ Novo Fluxo"**
2. Defina o nome e descrição
3. Escolha o **Trigger** (evento que dispara o fluxo)
4. Adicione nós no builder visual
5. Conecte os nós arrastando as linhas
6. Salve e ative

## Triggers Disponíveis (Eventos)
- **Pedido Confirmado** — Quando o pagamento é confirmado
- **Agendado** — Quando a entrega é agendada na Logzz
- **Em Separação** — Produto sendo preparado
- **Separado** — Produto pronto para envio
- **Saiu para Entrega** — Motorista a caminho
- **Entregue** — Entrega realizada com sucesso
- **Frustrado** — Tentativa de entrega falhou
- **Cancelado** — Pedido cancelado
- **Reagendar** — Cliente solicitou reagendamento

## Tipos de Nós

### 💬 Mensagem de Texto
Envia uma mensagem de texto via WhatsApp.
- Use **variáveis** para personalizar (ex: {{cliente_nome}})
- Suporta emojis e formatação (negrito, itálico)

### ⏰ Delay (Espera)
Pausa o fluxo por um tempo antes de continuar.
- Configure em minutos, horas ou dias
- Exemplo: Enviar mensagem de confirmação → Esperar 2h → Enviar mensagem de acompanhamento

### 🔀 Condição (If/Else)
Direciona o fluxo baseado em condições.
- Exemplo: Se método_pagamento = "PIX" → enviar mensagem A, senão → mensagem B

### 🎤 Áudio (Voz IA)
Gera e envia um áudio com voz artificial ultra-realista.
- Consome tokens de voz (ElevenLabs)
- Selecione a voz desejada

## Variáveis Disponíveis
Use {{variavel}} dentro das mensagens:

### Dados do Cliente
- **{{cliente_nome}}** — Nome completo do cliente
- **{{cliente_telefone}}** — Telefone com DDD
- **{{cliente_email}}** — Email (se informado)
- **{{cliente_documento}}** — CPF/CNPJ

### Dados do Pedido
- **{{pedido_numero}}** — Número do pedido (ex: #HN3SG6S8)
- **{{valor_total}}** — Valor total formatado (ex: R$ 149,90)
- **{{metodo_pagamento}}** — PIX, Cartão, Boleto, COD
- **{{data_pedido}}** — Data de criação do pedido

### Dados de Entrega
- **{{data_entrega}}** — Data agendada para entrega
- **{{codigo_rastreio}}** — Código de rastreio (Correios)
- **{{entregador}}** — Nome do entregador
- **{{endereco_completo}}** — Endereço de entrega

### Dados do Produto
- **{{produto_nome}}** — Nome do produto
- **{{produto_quantidade}}** — Quantidade

## Duplicar um Fluxo
1. Na lista de fluxos, clique nos **3 pontinhos (⋯)** do fluxo
2. Selecione **"Duplicar"**
3. Uma cópia é criada com o nome "(Cópia)" no final
4. Edite a cópia conforme necessário

## Estatísticas de Execução
No topo da tela de Fluxos, veja as métricas gerais:
- **Total de Execuções** — Quantas vezes os fluxos rodaram
- **Taxa de Sucesso** — Percentual de execuções concluídas
- **Falhas** — Quantidade de execuções com erro

## Proteção contra Duplicação
O ScalaCOD possui um **cooldown de 10 minutos**: se o mesmo pedido mudar de status duas vezes rapidamente, o fluxo não será disparado novamente para evitar spam.

## Gerar Fluxo com IA
1. Clique em **"Gerar com IA"** (ícone de estrela ✨)
2. Descreva o que deseja em linguagem natural (ex: "Quero um fluxo que avise o cliente quando o pedido sair para entrega e depois pergunte se recebeu")
3. A IA gera os nós e conexões automaticamente
4. Revise e ative

## Perguntas Frequentes

**P: Posso ter vários fluxos para o mesmo trigger?**
R: Sim, mas apenas os ativos serão executados. Recomendamos ter apenas 1 fluxo ativo por trigger.

**P: O fluxo respeita o horário comercial?**
R: Sim! Se configurado em Configurações → Loja, mensagens fora do horário são enfileiradas e enviadas no próximo horário comercial.

**P: Como sei se o fluxo está funcionando?**
R: Verifique as estatísticas no topo da página e as mensagens em Conversas. Cada execução é registrada.`,
    link: "/fluxos",
    linkLabel: "Abrir Fluxos →",
  },
  {
    id: "whatsapp",
    icon: "📱",
    label: "WhatsApp Cloud",
    title: "WhatsApp Cloud — Guia Completo de Conexão",
    content: `## Importância da Conexão WhatsApp
Sem o WhatsApp conectado, o ScalaCOD **não pode enviar mensagens automáticas**. É o primeiro passo obrigatório!

## Opções de Conexão

### 🟢 YCloud (Recomendado)
A YCloud é a forma mais fácil de usar a API Oficial do WhatsApp.

**Passo a Passo:**
1. Acesse **ycloud.com** e crie sua conta
2. Vá em **Settings → API Keys**
3. Copie sua **API Key**
4. No ScalaCOD, vá em **WhatsApp Cloud → Aba YCloud**
5. Cole a API Key no campo indicado
6. Configure o **Phone Number ID** (encontrado no painel da YCloud)
7. Clique em **"Salvar"**
8. Envie uma mensagem de teste para confirmar

**✅ Vantagens:** Fácil configuração, alta entregabilidade, suporte a templates, menor risco de banimento.

### 🔵 Meta/Facebook (API Oficial Direta)
Conexão direta com a API do WhatsApp Business Platform.

**Passo a Passo:**
1. Acesse **developers.facebook.com**
2. Crie um app do tipo **Business**
3. Adicione o produto **WhatsApp**
4. Em WhatsApp → Getting Started, copie o **Phone Number ID**
5. Gere um **Access Token permanente** (System User Token)
6. No ScalaCOD, vá em **WhatsApp Cloud → Aba Meta**
7. Cole o Phone Number ID e o Access Token
8. Configure a URL do Webhook (mostrada na tela)
9. Clique em **"Salvar"**

**✅ Vantagens:** Controle total, sem intermediários.
**⚠️ Desvantagens:** Configuração mais complexa, requer aprovação da Meta.

### 🟡 Evolution API (Sem aprovação)
Usa o WhatsApp Web via API (não-oficial).

**Passo a Passo:**
1. Instale o Evolution API em seu servidor (Docker recomendado)
2. No ScalaCOD, vá em **WhatsApp Cloud → Aba Evolution**
3. Cole a **URL do servidor** (ex: https://evolution.seuservidor.com)
4. Cole a **API Key** do Evolution
5. Defina o **Nome da Instância**
6. Clique em **"Conectar"**
7. Escaneie o **QR Code** com seu WhatsApp
8. Aguarde a conexão (30 segundos)

**✅ Vantagens:** Sem custo por mensagem, sem aprovação Meta, configuração rápida.
**⚠️ Desvantagens:** Risco de banimento (não-oficial), sem templates, menor estabilidade.

## Qual escolher?

| Critério | YCloud | Meta | Evolution |
|---|---|---|---|
| Facilidade | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Estabilidade | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Custo | Pago | Pago | Gratuito |
| Risco de ban | Baixo | Baixo | Alto |
| Templates | Sim | Sim | Não |

## Perguntas Frequentes

**P: Posso trocar de provedor depois?**
R: Sim! Basta configurar o novo provedor. As conversas antigas permanecem salvas.

**P: Preciso de um número exclusivo?**
R: Para YCloud e Meta, sim. Para Evolution, você pode usar seu número pessoal (não recomendado para alto volume).`,
    link: "/whatsapp-cloud",
    linkLabel: "Configurar WhatsApp →",
  },
  {
    id: "leads",
    icon: "👥",
    label: "Leads",
    title: "Leads — Gestão Completa de Clientes",
    content: `## O que são Leads?
Leads são todos os clientes que interagiram com seus checkouts. Cada pedido cria ou atualiza um lead automaticamente com nome, telefone, email, documento e receita acumulada.

## Visualizações

### 📋 Tabela
- Lista completa com colunas: Nome, Telefone, Email, Status, Receita, Tags
- Ordenação por qualquer coluna
- Ideal para análise e exportação

### 📱 Grid
- Cards visuais por cliente
- Avatar, nome, telefone e status visíveis
- Ideal para navegação rápida

## Filtros Disponíveis
- **Todos** — Todos os leads cadastrados
- **Confirmados** — Leads com pelo menos 1 pedido confirmado
- **Em Aguardo** — Leads com pedido aguardando pagamento
- **Cancelados** — Leads que tiveram todos os pedidos cancelados

## Busca
Digite no campo de busca para filtrar por:
- Nome do cliente
- Telefone (com ou sem DDD)
- Email

## Tags (Etiquetas)
Adicione tags personalizadas aos leads para segmentação:
- Ex: "VIP", "Recompra", "Inadimplente"
- Use tags nos filtros de Disparos (Campanhas)

## Receita Acumulada
Cada lead mostra o valor total de pedidos confirmados. Identifique seus melhores clientes!

## Importar Leads (CSV)
1. Prepare um arquivo CSV com colunas: nome, telefone (obrigatório), email
2. Clique em **"Importar"**
3. Faça upload do arquivo
4. Os leads serão criados automaticamente

**💡 Dica:** Importe sua base de clientes existente para disparar campanhas de reengajamento.`,
    link: "/leads",
    linkLabel: "Abrir Leads →",
  },
  {
    id: "vozes",
    icon: "🎤",
    label: "Vozes (IA)",
    title: "Vozes — Áudios com Inteligência Artificial",
    content: `## O que é o módulo de Vozes?
O módulo de Vozes usa a tecnologia **ElevenLabs** para gerar áudios ultra-realistas a partir de texto. Você pode usar vozes prontas ou **clonar sua própria voz**!

## Tokens de Voz
- Cada **caractere de texto = 1 token**
- Tokens são consumidos ao gerar áudio
- Compre pacotes de tokens no módulo Vozes → Aba "Pacotes"
- Seu saldo aparece no topo da tela

## Usando Vozes nos Fluxos
1. No builder de fluxos, adicione um nó do tipo **"Áudio"**
2. Selecione a voz desejada na lista
3. Digite o texto que será convertido em áudio
4. Use **variáveis** (ex: {{cliente_nome}}) para personalizar
5. O áudio é gerado em tempo real e enviado via WhatsApp

## Clonando sua Voz — Passo a Passo
1. Vá em **Vozes → + Clonar Voz**
2. Dê um nome para a voz (ex: "Minha Voz")
3. Faça upload de um ou mais arquivos de áudio:
   - **Mínimo:** 1 minuto de gravação
   - **Ideal:** 10 a 30 minutos
   - **Formatos:** MP3, WAV, OGG, M4A
4. Clique em **"Clonar"**
5. Aguarde o processamento (2 a 5 minutos)
6. A voz aparecerá na sua lista com o badge "Clonada"

## Dicas para Melhor Qualidade
- **Grave em ambiente silencioso** — Sem ruído de fundo
- **Fale de forma natural** — Como se estivesse conversando
- **Maior duração = melhor resultado** — 15+ minutos ideal
- **Evite música de fundo** — Apenas voz

## Biblioteca de Vozes
Além de clonar, você pode usar vozes da biblioteca ElevenLabs:
1. Clique em **"Biblioteca"**
2. Ouça os previews
3. Clique em **"Adicionar"** para usar em seus fluxos

## Perguntas Frequentes

**P: Quantos tokens preciso para uma mensagem?**
R: Depende do tamanho do texto. Ex: "Olá João, seu pedido está a caminho!" = ~42 tokens.

**P: Posso excluir uma voz clonada?**
R: Sim, clique nos 3 pontinhos e selecione "Excluir". Os tokens já consumidos não são reembolsados.`,
    link: "/vozes",
    linkLabel: "Abrir Vozes →",
  },
  {
    id: "disparos",
    icon: "📢",
    label: "Disparos (Campanhas)",
    title: "Disparos — Campanhas em Massa via WhatsApp",
    content: `## O que são Disparos?
Disparos permitem enviar mensagens em massa via WhatsApp para toda sua base de leads. Ideal para promoções, reativação de clientes inativos e comunicados.

## Pré-requisitos
- ✅ WhatsApp conectado (YCloud ou Meta — API Oficial)
- ✅ Template de mensagem aprovado pela Meta
- ✅ Leads cadastrados no sistema

**⚠️ Importante:** Disparos em massa **não funcionam** com Evolution API (não-oficial). Apenas com API Oficial (YCloud ou Meta).

## Criando uma Campanha — Passo a Passo
1. Vá em **Disparos → + Nova Campanha**
2. Defina o **nome** da campanha (ex: "Promoção Black Friday")
3. Selecione o **Template aprovado** pela Meta
4. Defina o **público-alvo:**
   - Todos os leads
   - Filtrado por status (Confirmados, Aguardando, etc.)
   - Filtrado por tags
5. Escolha quando enviar:
   - **Imediatamente** — Disparo começa agora
   - **Agendar** — Defina data e hora
6. Clique em **"Criar Campanha"**

## Acompanhando o Disparo
Após criar, acompanhe em tempo real:
- **Total de destinatários**
- **Enviados** — Mensagens processadas
- **Entregues** — Confirmadas pelo WhatsApp
- **Falhas** — Mensagens que não foram enviadas

## Limites
- Máximo de **500 envios por hora** (limite da API)
- Apenas **templates aprovados** pela Meta
- Respeite o horário comercial para melhores resultados

## Templates — Como funciona?
Templates são mensagens pré-aprovadas pela Meta. Para criar:
1. Acesse o painel da YCloud ou Meta Business
2. Crie um template com categoria "Marketing" ou "Utility"
3. Aguarde aprovação (geralmente 24h)
4. O template aparecerá automaticamente no ScalaCOD

## Perguntas Frequentes

**P: Posso cancelar um disparo em andamento?**
R: Sim! Na lista de campanhas, clique em "Pausar" para interromper.

**P: O que acontece se o número for inválido?**
R: O envio falha silenciosamente e é contabilizado como "Falha" nas métricas.`,
    link: "/disparos",
    linkLabel: "Abrir Disparos →",
  },
  {
    id: "configuracoes",
    icon: "⚙️",
    label: "Configurações",
    title: "Configurações — Personalize sua Operação",
    content: `## Visão Geral
As configurações controlam todos os aspectos operacionais do ScalaCOD. Cada aba tem uma função específica.

## 🏪 Loja
- **Nome da Loja:** Aparece nos checkouts e mensagens
- **Horário Comercial:** Define quando os fluxos automáticos podem enviar mensagens
  - Fora do horário → mensagens são **enfileiradas** e enviadas no próximo horário
  - Configure por dia da semana (seg-dom)
  - Defina hora de início e fim

## 🔗 Integrações

### Logzz (Entrega COD)
1. Acesse sua conta Logzz
2. Copie o **Token de API** nas configurações
3. Cole no ScalaCOD e salve
4. Teste clicando em **"Testar Conexão"**

### Coinzz (Correios)
1. Acesse sua conta Coinzz
2. Copie o **Token de API**
3. Cole no ScalaCOD e salve

### MercadoPago
1. Acesse developers.mercadopago.com.br
2. Em Credenciais → Produção, copie o **Access Token**
3. Cole no ScalaCOD e salve
4. Os webhooks são configurados automaticamente

## 🔑 API
Gere tokens de API para integrar sistemas externos:
1. Clique em **"+ Novo Token"**
2. Defina um nome descritivo
3. Copie o token gerado (só aparece uma vez!)
4. Use nos headers das suas requisições: Authorization: Bearer {token}

## 🔔 Webhooks
Configure URLs para receber notificações em tempo real:
1. Clique em **"+ Novo Webhook"**
2. Cole a URL do seu servidor
3. Selecione os eventos que deseja receber:
   - Novo pedido, Status alterado, Pagamento confirmado
4. Uma **secret key** é gerada para validar as requisições

## 🔔 Notificações
Configure alertas por email:
- **Novo Pedido** — Receba email quando entrar um pedido
- **Entregue** — Quando um pedido for entregue
- **Frustrado** — Quando uma entrega falhar
- **Novo Lead** — Quando um novo cliente se cadastrar
- **Relatório Semanal** — Resumo das métricas da semana

## 👥 Equipe
Gerencie os membros da sua equipe:

### Convidando
1. Clique em **"+ Convidar"**
2. Digite o email do membro
3. Escolha o papel: **Admin**, **Operador** ou **Viewer**
4. O convidado recebe um email com link de acesso
5. Após aceitar, ele pode acessar com login próprio

### Papéis e Permissões
- **Admin:** Acesso total (pedidos, leads, fluxos, configurações, equipe)
- **Operador:** Pode ver e editar pedidos, conversas e leads. NÃO pode alterar configurações
- **Viewer:** Apenas visualização. Não pode editar nada

### Auditoria
Todas as ações dos membros são registradas no log de auditoria com data, hora e detalhes.

## 💰 MercadoPago (Aba dedicada)
Detalhes sobre a integração de pagamentos — veja a seção "MercadoPago" nesta central.

## 📊 Logzz (Logs)
Visualize os logs de comunicação com a Logzz para debugar problemas de integração.`,
    link: "/configuracoes",
    linkLabel: "Abrir Configurações →",
  },
  {
    id: "mercadopago",
    icon: "💳",
    label: "MercadoPago",
    title: "MercadoPago — Pagamentos Online Completo",
    content: `## Por que configurar o MercadoPago?
O MercadoPago é necessário para receber pagamentos online quando o cliente está em regiões **não atendidas pela Logzz** (usando Coinzz/Correios). Sem ele, esses clientes não conseguem comprar.

## Configuração — Passo a Passo Detalhado

### 1. Acesse o MercadoPago
1. Vá em **mercadopago.com.br** e faça login
2. Acesse **Seu negócio → Configurações → Credenciais**
3. Selecione a aba **Produção** (não use Teste!)
4. Copie o **Access Token** (começa com APP_USR-)

### 2. Configure no ScalaCOD
1. Vá em **Configurações → MercadoPago**
2. Cole o Access Token no campo indicado
3. Clique em **"Salvar"**
4. O sistema configura automaticamente os webhooks

### 3. Teste
1. Crie um pedido de teste no checkout
2. Escolha PIX como pagamento
3. Verifique se o QR Code aparece
4. Após pagar, verifique se o status atualiza automaticamente

## Métodos de Pagamento Suportados

### PIX
- Aprovação **instantânea** (geralmente 5-30 segundos)
- QR Code gerado automaticamente
- Webhook atualiza o status do pedido em tempo real
- **Mais popular** — 70%+ dos pagamentos online

### Cartão de Crédito
- Aprovação em **segundos**
- Suporta parcelamento em até **12x**
- Taxas do MercadoPago se aplicam

### Boleto Bancário
- Aprovação em **1 a 3 dias úteis**
- Gerado automaticamente com vencimento
- Webhook atualiza quando compensado

## Webhooks Automáticos
O ScalaCOD configura automaticamente os webhooks para:
- **payment.created** — Pagamento criado
- **payment.updated** — Status do pagamento atualizado
- **preapproval.updated** — Assinatura atualizada

## Perguntas Frequentes

**P: O dinheiro cai direto na minha conta MercadoPago?**
R: Sim! O ScalaCOD não retém nenhum valor. As taxas do MercadoPago são descontadas automaticamente.

**P: Posso usar sandbox/teste primeiro?**
R: Sim, use as credenciais de Teste do MercadoPago. Mas lembre-se de trocar para Produção quando for para o ar.

**P: E se o webhook falhar?**
R: O MercadoPago reenvia webhooks automaticamente. O ScalaCOD também faz polling de status como backup.`,
    link: "/configuracoes",
    linkLabel: "Abrir Configurações →",
  },
  {
    id: "coinzz",
    icon: "📬",
    label: "Coinzz (Correios)",
    title: "Coinzz — Entrega via Correios Completo",
    content: `## O que é a Coinzz?
A Coinzz é a plataforma de logística que permite enviar produtos via **Correios** quando a Logzz não atende o CEP do cliente. Funciona como um fallback inteligente.

## Como funciona no fluxo de compra?
1. Cliente acessa o checkout e digita o CEP
2. Sistema consulta se a Logzz atende aquele CEP
3. **Se atende** → Modo COD (pagamento na entrega via Logzz)
4. **Se NÃO atende** → Modo Coinzz automaticamente:
   - Calcula o frete via Correios
   - Exibe opções de pagamento online (PIX, Cartão, Boleto)
   - Após pagamento, você despacha pelos Correios

## Configuração — Passo a Passo

### 1. Crie sua conta na Coinzz
1. Acesse **coinzz.com.br**
2. Crie sua conta e cadastre seus produtos
3. Configure preços e ofertas

### 2. Obtenha o Token
1. No painel da Coinzz, vá em **Configurações → API**
2. Copie o **Token de API**

### 3. Configure no ScalaCOD
1. Vá em **Configurações → Integrações → Coinzz**
2. Cole o token e salve
3. Teste a conexão

### 4. Vincule ao Checkout
1. Ao criar/editar um checkout, no campo **"Hash da Oferta Coinzz"**
2. Cole o hash da oferta (encontrado no painel Coinzz)
3. Isso permite cálculo automático de frete

## Hash da Oferta
Cada produto/oferta na Coinzz tem um hash único. Esse hash vincula o checkout do ScalaCOD à oferta na Coinzz para:
- Calcular frete automaticamente
- Criar pedido na Coinzz quando o pagamento é confirmado
- Gerar etiqueta de envio

## Perguntas Frequentes

**P: Preciso ter Logzz E Coinzz?**
R: Não é obrigatório, mas recomendado. A Coinzz é o fallback para CEPs não atendidos pela Logzz, aumentando sua cobertura nacional.

**P: O frete é cobrado do cliente?**
R: Sim, o valor do frete (Correios) é adicionado automaticamente ao total no checkout.

**P: Preciso do MercadoPago para Coinzz funcionar?**
R: Sim! O MercadoPago processa os pagamentos online dos pedidos Coinzz.`,
    link: "/configuracoes",
    linkLabel: "Abrir Configurações →",
  },
  {
    id: "equipe",
    icon: "👨‍💼",
    label: "Equipe",
    title: "Equipe — Gestão Colaborativa Completa",
    content: `## Visão Geral
O módulo de equipe permite convidar colaboradores para ajudar na operação. Cada membro tem permissões específicas baseadas no seu papel.

## Convidando um Membro — Passo a Passo
1. Vá em **Configurações → Equipe**
2. Clique em **"+ Convidar Membro"**
3. Preencha:
   - **Email:** Email do colaborador (precisa ter conta no ScalaCOD)
   - **Papel:** Admin, Operador ou Viewer
4. Clique em **"Enviar Convite"**
5. O colaborador recebe um email com link de convite
6. Ao clicar no link e fazer login, ele é adicionado à equipe

## Papéis Detalhados

### 👑 Admin
- ✅ Ver e editar todos os pedidos
- ✅ Gerenciar fluxos e automações
- ✅ Acessar configurações
- ✅ Convidar e remover membros
- ✅ Ver relatórios financeiros
- ✅ Acessar dashboard completo
- ❌ Não pode excluir a conta do dono

### 🔧 Operador
- ✅ Ver e editar pedidos
- ✅ Responder conversas
- ✅ Gerenciar leads
- ✅ Adicionar notas internas
- ❌ Não pode alterar configurações
- ❌ Não pode gerenciar fluxos
- ❌ Não pode convidar membros

### 👁️ Viewer
- ✅ Visualizar todos os módulos
- ❌ Não pode editar nada
- ❌ Não pode responder mensagens
- ❌ Não pode mover pedidos

## Atribuição de Conversas
- Cada conversa pode ser atribuída a um membro específico
- O nome do agente aparece no card da conversa
- Filtre conversas por agente atribuído

## Logs de Auditoria
Todas as ações são registradas:
- Quem fez (email do membro)
- O que fez (ação realizada)
- Quando fez (data e hora)
- Detalhes adicionais (metadata)

Acesse em **Configurações → Equipe → Logs**

## Removendo um Membro
1. Na lista de membros, clique nos 3 pontinhos
2. Selecione **"Remover"**
3. Confirme a remoção
4. O acesso é revogado imediatamente

## Perguntas Frequentes

**P: Quantos membros posso ter?**
R: Depende do seu plano. Consulte a página de Planos para ver os limites.

**P: O membro precisa criar uma conta primeiro?**
R: Sim, o convite direciona para o cadastro se não tiver conta.`,
    link: "/configuracoes",
    linkLabel: "Abrir Configurações →",
  },
  {
    id: "dashboard",
    icon: "📊",
    label: "Dashboard",
    title: "Dashboard — Painel de Métricas em Tempo Real",
    content: `## Visão Geral
O Dashboard é o painel principal do ScalaCOD. Mostra todas as métricas importantes da sua operação em tempo real.

## Métricas Disponíveis

### 💰 Receita Estimada
Soma dos valores de todos os pedidos confirmados no período selecionado. Inclui pedidos COD (Logzz) e online (Coinzz).

### 👥 Visitantes
Número de pessoas únicas que acessaram seus checkouts no período.

### 📄 Pageviews
Total de visualizações de página dos checkouts. Um visitante pode gerar múltiplos pageviews.

### 🖱️ Interações
Cliques e interações nos checkouts (preenchimento de campos, seleção de frete, etc.).

### 📈 Taxa de Conversão
Percentual de visitantes que finalizaram um pedido. Fórmula: (Pedidos / Visitantes) × 100.

### 📉 Taxa de Abandono
Percentual de visitantes que NÃO finalizaram. Fórmula: 100% - Taxa de Conversão.

### 💳 Coinzz Pagos
Quantidade de pedidos Coinzz (pagamento online) que foram pagos no período.

### 📨 Fila WhatsApp
Mensagens automáticas aguardando envio. Se esse número ficar alto, verifique sua conexão WhatsApp.

### 💬 Conversas Abertas
Quantidade de conversas com status "Aberta" — atendimentos em andamento.

### ✅ Resolvidas
Quantidade de conversas finalizadas no período.

## Filtros de Período
- **Hoje** — Dados das últimas 24 horas
- **7 dias** — Última semana
- **30 dias** — Último mês
- **Máximo** — Todos os dados desde o início
- **📅 Personalizado** — Clique no ícone de calendário para escolher um período específico

## Dados em Tempo Real
O dashboard atualiza automaticamente quando:
- Um novo pedido é criado
- Um evento de pixel é registrado
- O status de um pedido muda

## Dicas de Uso

**💡 Acompanhe diariamente:**
Visite o dashboard pelo menos 1x por dia para identificar tendências. Uma queda na conversão pode indicar problemas no checkout.

**💡 Compare períodos:**
Use o filtro de 7 dias e compare com a semana anterior para identificar crescimento ou queda.

**💡 Fila WhatsApp alta?**
Se a fila ficar acima de 50 mensagens, verifique se o WhatsApp está conectado e se o horário comercial está configurado corretamente.`,
    link: "/dashboard",
    linkLabel: "Abrir Dashboard →",
  },
  {
    id: "pixel",
    icon: "🎯",
    label: "Pixel e CAPI",
    title: "Pixel do Facebook e CAPI — Rastreamento Avançado",
    content: `## O que é o Pixel do Facebook?
O Pixel é um código de rastreamento que registra ações dos visitantes nos seus checkouts. Essencial para otimizar anúncios no Facebook/Instagram.

## O que é o CAPI (Conversions API)?
O CAPI envia eventos diretamente do servidor, sem depender do navegador. É mais preciso porque:
- ✅ Não é bloqueado por adblockers
- ✅ Não depende de cookies
- ✅ Dados mais confiáveis para o Meta Ads

## Configurando — Passo a Passo

### Pixel do Facebook
1. Acesse o **Meta Business Suite → Events Manager**
2. Copie o **Pixel ID** (número de ~15 dígitos)
3. No ScalaCOD, ao criar/editar um checkout:
   - Cole o Pixel ID no campo **"Pixel Facebook"**
4. Salve

### CAPI (Server-Side)
1. No **Events Manager**, gere um **Access Token** do CAPI
2. No ScalaCOD, cole o token no campo **"Meta CAPI Token"**
3. Os eventos serão enviados via servidor automaticamente

## Eventos Disparados

| Evento | Quando | Dados enviados |
|---|---|---|
| PageView | Acesso ao checkout | URL, user agent |
| InitiateCheckout | Início do preenchimento | Produto, valor |
| AddPaymentInfo | Dados de pagamento | Método, parcelas |
| Purchase | Pedido finalizado | Valor, produto, ID |

## Google Ads
1. Cole o **Google Ads ID** (ex: AW-123456789)
2. Cole o **Conversion ID** para rastrear conversões
3. Eventos de compra são enviados automaticamente

## Google Analytics
1. Cole o **GA4 Measurement ID** (ex: G-XXXXXXXXXX)
2. Pageviews e eventos são rastreados automaticamente

## Dicas

**💡 Use Pixel + CAPI juntos:** A Meta recomenda usar ambos. O sistema de deduplicação evita eventos duplicados.

**💡 Teste com o Pixel Helper:** Instale a extensão "Meta Pixel Helper" no Chrome para verificar se os eventos estão disparando corretamente.`,
    link: "/checkouts",
    linkLabel: "Configurar no Checkout →",
  },
  {
    id: "orderbump",
    icon: "🛍️",
    label: "Order Bump",
    title: "Order Bump — Aumente seu Ticket Médio",
    content: `## O que é Order Bump?
Order Bump é uma oferta adicional que aparece no checkout, antes do botão de compra. O cliente pode adicionar o produto extra com um único clique, sem sair da página.

## Por que usar?
- 📈 Aumenta o ticket médio em até **30%**
- 🎯 Conversão alta porque o cliente já está comprando
- ⚡ Zero fricção — basta marcar um checkbox

## Configurando — Passo a Passo
1. Crie ou edite um checkout
2. No **Passo 2**, ative o toggle **"Order Bump"**
3. Busque o produto complementar na Logzz
4. Defina:
   - **Nome do Bump** — Título que aparece para o cliente
   - **Descrição** — Texto persuasivo (ex: "Aproveite e leve também!")
   - **Preço original** — Preço riscado (opcional)
   - **Preço promocional** — Valor real do bump
5. Salve o checkout

## Exemplos de Order Bump Eficazes
- Produto principal: Tênis → Bump: Kit de Meias (R$ 29,90)
- Produto principal: Creme facial → Bump: Sabonete especial (R$ 19,90)
- Produto principal: Celular → Bump: Capinha + Película (R$ 39,90)

## Dicas

**💡 Preço baixo:** O bump deve custar no máximo 30% do produto principal.

**💡 Complementar:** O bump deve fazer sentido com o produto principal (não coloque um livro como bump de um tênis).

**💡 Urgência:** Use descrições como "Apenas nesta compra" ou "Oferta exclusiva".

## Hash do Bump
Cada Order Bump tem um hash que vincula à oferta na Logzz/Coinzz. O sistema gerencia isso automaticamente ao selecionar o produto.`,
    link: "/checkouts",
    linkLabel: "Configurar Order Bump →",
  },
  {
    id: "notasinternas",
    icon: "📝",
    label: "Notas Internas",
    title: "Notas Internas — Comunicação Interna da Equipe",
    content: `## O que são Notas Internas?
Notas internas são anotações que ficam vinculadas a uma conversa e são visíveis **apenas para a equipe**. O cliente nunca vê as notas.

## Para que servem?
- 📋 Registrar informações sobre o atendimento
- 🔄 Passar contexto entre turnos de atendimento
- ⚠️ Alertar sobre clientes problemáticos
- 📦 Anotar detalhes sobre pedidos ou trocas

## Como usar — Passo a Passo
1. Abra uma conversa no módulo **Conversas**
2. No painel lateral direito, localize a seção **"Notas Internas"**
3. Clique no ícone **📝**
4. Digite sua nota
5. Clique em **"Adicionar Nota"**
6. A nota é salva permanentemente no banco de dados

## Exemplos de Notas Úteis
- "Cliente pediu para trocar tamanho M por G. Aguardando confirmação do estoque."
- "Terceira reclamação deste cliente. Oferecer desconto de 10% na próxima compra."
- "Pedido #ABC123 devolvido. Reembolso processado em 15/03."
- "VIP - sempre compra 2+ unidades. Priorizar atendimento."

## Funcionalidades
- **Persistência:** Notas ficam salvas permanentemente no banco de dados
- **Equipe:** Qualquer membro da equipe pode ver e adicionar notas
- **Indicador:** Conversas com notas mostram um badge numérico na lista
- **Histórico:** Cada nota mostra quem escreveu, data e hora
- **Ordenação:** Notas mais recentes aparecem primeiro

## Perguntas Frequentes

**P: O cliente pode ver as notas?**
R: Não! Notas internas são 100% privadas e visíveis apenas para a equipe.

**P: Posso editar ou excluir uma nota?**
R: Atualmente, notas são permanentes. Adicione uma nova nota com a correção se necessário.`,
    link: "/conversas",
    linkLabel: "Abrir Conversas →",
  },
];

function renderMarkdown(md: string) {
  const lines = md.trim().split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1]?.includes("---")) {
      const headers = line.split("|").filter(c => c.trim()).map(c => c.trim());
      i++; // skip separator
      i++;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]?.includes("|")) {
        rows.push(lines[i].split("|").filter(c => c.trim()).map(c => c.trim()));
        i++;
      }
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/70">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-border last:border-0 hover:bg-muted/30">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-muted-foreground" dangerouslySetInnerHTML={{ __html: boldify(cell) }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="text-sm font-semibold text-foreground mt-5 mb-1.5 flex items-center gap-2">
          {line.slice(4)}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-base font-bold text-foreground mt-6 mb-2 pb-1 border-b border-border/50">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 text-sm text-muted-foreground ml-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: boldify(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1.5 text-sm text-muted-foreground ml-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {idx + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: boldify(item) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    } else if (line.trim() === "") {
      // skip blank
    } else {
      elements.push(
        <p key={i} className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: boldify(line) }} />
      );
    }
    i++;
  }

  return <div className="space-y-1.5">{elements}</div>;
}

function boldify(text: string) {
  let result = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
  // Highlight tips, warnings, and important notes
  result = result.replace(/💡 Dica:/g, '<span class="text-primary font-semibold">💡 Dica:</span>');
  result = result.replace(/⚠️ Importante:/g, '<span class="text-amber-500 font-semibold">⚠️ Importante:</span>');
  result = result.replace(/✅/g, '<span class="text-emerald-500">✅</span>');
  result = result.replace(/❌/g, '<span class="text-red-500">❌</span>');
  return result;
}

function TutorialContent({ section }: { section: TutorialSectionData }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-6 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{section.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-card-foreground">{section.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{section.label}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {section.steps && (
          <div className="space-y-3">
            {section.steps.map((step, i) => (
              <div key={i} className="flex gap-4 p-4 bg-muted/40 rounded-xl border border-border/30">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground mb-1 text-sm">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  {step.link && (
                    <Link
                      to={step.link}
                      className="text-sm text-primary hover:text-primary/80 font-medium mt-2 inline-flex items-center gap-1"
                    >
                      {step.linkLabel}
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {section.content && renderMarkdown(section.content)}

        {section.link && (
          <div className="pt-4 border-t border-border">
            <Link
              to={section.link}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              {section.linkLabel}
              <ExternalLink size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

const Suporte = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("inicio");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return TUTORIAL_SECTIONS;
    const q = searchQuery.toLowerCase();
    return TUTORIAL_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.label.toLowerCase().includes(q) ||
        s.content?.toLowerCase().includes(q) ||
        s.steps?.some((st) => st.title.toLowerCase().includes(q) || st.description.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const activeContent = useMemo(() => TUTORIAL_SECTIONS.find((s) => s.id === activeSection), [activeSection]);
  const totalSections = TUTORIAL_SECTIONS.length;

  return (
    <div className="py-6">
      <PageHeader title="Central de Suporte 🥷" subtitle={`${totalSections} tutoriais detalhados — aprenda tudo sobre o ScalaCOD`} />

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 mt-4 mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
          <BookOpen size={14} />
          {totalSections} Tutoriais
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-medium">
          <CheckCircle2 size={14} />
          Auto-didático
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-xs font-medium">
          <Lightbulb size={14} />
          Dicas incluídas
        </div>
      </div>

      <div className="flex gap-6">
        {/* Side nav */}
        <aside className="w-56 flex-shrink-0 hidden lg:block">
          <div className="bg-card rounded-xl border border-border p-4 sticky top-20">
            <h3 className="font-semibold text-card-foreground mb-3 text-sm flex items-center gap-2">
              <BookOpen size={14} />
              Tutoriais
            </h3>
            <nav className="space-y-0.5 max-h-[70vh] overflow-y-auto">
              {TUTORIAL_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeSection === section.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span>{section.icon}</span>
                  <span className="truncate">{section.label}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content — shows only the selected tutorial */}
        <main className="flex-1 min-w-0 space-y-4">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tutorial... (ex: checkout, fluxo, pixel, equipe)"
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm bg-card text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>

          {searchQuery.trim() ? (
            filtered.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle size={40} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum tutorial encontrado para "{searchQuery}"</p>
                <p className="text-muted-foreground/70 text-xs mt-1">Tente buscar por palavras-chave como "checkout", "fluxo" ou "whatsapp"</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
                {filtered.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => { setActiveSection(section.id); setSearchQuery(""); }}
                    className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-2xl">{section.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-card-foreground">{section.title}</h3>
                      <p className="text-xs text-muted-foreground">{section.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            activeContent && <TutorialContent section={activeContent} />
          )}

          {/* Mobile topic selector */}
          <div className="lg:hidden mt-6">
            <label className="text-xs text-muted-foreground font-medium mb-2 block">Outros tutoriais</label>
            <div className="flex flex-wrap gap-2">
              {TUTORIAL_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    activeSection === s.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Suporte;
