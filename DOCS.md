# ScalaCOD — Documentação Completa do Projeto

> **Versão**: 1.0.0 — Obsidian Edition  
> **Stack**: React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3 + Supabase  
> **Data**: Abril 2026

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Módulos do Sistema](#módulos-do-sistema)
4. [Banco de Dados](#banco-de-dados)
5. [Edge Functions](#edge-functions)
6. [Cron Jobs](#cron-jobs)
7. [Autenticação & Autorização](#autenticação--autorização)
8. [Integrações Externas](#integrações-externas)
9. [Páginas & Rotas](#páginas--rotas)
10. [Variáveis de Ambiente](#variáveis-de-ambiente)
11. [Deploy](#deploy)

---

## 1. Visão Geral

O **ScalaCOD** é uma plataforma SaaS completa para gestão de vendas no modelo COD (Cash on Delivery) no Brasil. Integra checkout híbrido com 3 providers de logística (Logzz, Coinzz, Hyppe), automação de WhatsApp, remarketing de vendas frustradas, CRM de leads, vozes com IA e painel administrativo.

### Funcionalidades principais

| Módulo | Descrição |
|--------|-----------|
| **Checkout Híbrido** | Checkout público com detecção de CEP e roteamento automático entre Logzz, Coinzz e Hyppe com prioridade configurável |
| **Kanban de Pedidos** | Painel em tempo real com status dos pedidos sincronizado via webhooks |
| **Automação WhatsApp** | Fluxos automáticos de mensagens por status de pedido (Evolution API / Meta Cloud) |
| **Remarketing** | Recuperação de vendas frustradas com cadência de 30 dias e desconto progressivo |
| **Disparos em Massa** | Campanhas de WhatsApp segmentadas por status, tags e comportamento |
| **Flow Builder** | Editor visual drag & drop para criação de fluxos de automação |
| **Vozes IA** | Clone de voz e geração de áudio via ElevenLabs |
| **Leads / CRM** | Gestão de leads com tags, segmentação e histórico |
| **Pixel Analytics** | Facebook Pixel + Meta CAPI server-side + Google Ads |
| **Admin Panel** | Painel administrativo com gestão de assinantes, planos e tokens |
| **Equipe** | Convites por e-mail, papéis (admin/membro) e controle de acesso |
| **Planos & Assinaturas** | Integração com MercadoPago para cobrança recorrente |

---

## 2. Arquitetura

```
┌──────────────────────────────────────────────────┐
│                    Frontend                       │
│     React 18 + Vite + Tailwind + shadcn/ui       │
│              SPA (Single Page App)                │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│                  Supabase                         │
│  ┌────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Database   │ │   Auth   │ │   Storage     │  │
│  │ PostgreSQL  │ │  GoTrue  │ │   (audio,     │  │
│  │  45 tables  │ │          │ │  home-images) │  │
│  └────────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────────────────────────────────────┐    │
│  │        Edge Functions (Deno)             │    │
│  │  30+ functions serverless               │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │         Cron Jobs (pg_cron)              │    │
│  │  4 jobs automáticos                     │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  Logzz   │ │  Coinzz  │ │  Hyppe   │
   │  API     │ │  API     │ │  API     │
   └──────────┘ └──────────┘ └──────────┘
          │            │            │
          ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ WhatsApp │ │ Mercado  │ │ Eleven   │
   │ (Meta/   │ │  Pago    │ │  Labs    │
   │Evolution)│ │          │ │          │
   └──────────┘ └──────────┘ └──────────┘
```

### Estrutura de Diretórios

```
src/
├── App.tsx                    # Router principal
├── main.tsx                   # Entry point
├── index.css                  # Design tokens (CSS variables)
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── admin/                 # Componentes do painel admin
│   ├── chat/                  # Chat WhatsApp
│   ├── fluxos/                # Flow Builder
│   ├── home/                  # Landing page sections
│   ├── remarketing/           # Módulo de remarketing
│   ├── settings/              # Abas de configuração
│   └── whatsapp/              # Configuração WhatsApp
├── contexts/
│   ├── AuthContext.tsx         # Contexto de autenticação
│   └── MobileSidebarContext.tsx
├── hooks/
│   ├── useHomeSettings.ts     # Settings da landing page
│   ├── useTeamContext.ts      # Contexto de equipe
│   ├── useFeatureGate.tsx     # Gate de funcionalidades por plano
│   └── ...
├── lib/
│   ├── utils.ts               # Utilidades (cn, formatação)
│   ├── notify.ts              # Sistema de notificações
│   ├── pixel.ts               # Pixel tracking
│   └── status-mapping.ts      # Mapeamento de status COD
├── pages/
│   ├── Dashboard.tsx           # Painel principal
│   ├── Checkouts.tsx           # Gestão de checkouts
│   ├── Pedidos.tsx             # Kanban de pedidos
│   ├── Leads.tsx               # CRM de leads
│   ├── Conversas.tsx           # Chat WhatsApp
│   ├── Fluxos.tsx              # Fluxos + Remarketing
│   ├── Vozes.tsx               # Vozes IA
│   ├── Disparos.tsx            # Disparos em massa
│   ├── Home.tsx                # Landing page
│   └── admin/                  # Páginas do admin
└── integrations/
    └── supabase/
        ├── client.ts           # Cliente Supabase (auto-gerado)
        └── types.ts            # Types do banco (auto-gerado)

supabase/
├── config.toml                 # Configuração do projeto
├── functions/
│   ├── checkout-api/           # API do checkout público
│   ├── logzz-webhook/          # Webhook da Logzz
│   ├── hyppe-webhook/          # Webhook da Hyppe
│   ├── coinzz-webhook/         # Webhook da Coinzz
│   ├── trigger-flow/           # Motor de fluxos
│   ├── execute-flow/           # Execução de fluxos
│   ├── process-remarketing/    # Processamento de remarketing
│   ├── send-whatsapp-message/  # Envio de WhatsApp
│   ├── whatsapp-webhook/       # Recebimento de mensagens
│   └── ...                     # 30+ functions
└── migrations/                 # Migrações SQL
```

---

## 3. Módulos do Sistema

### 3.1 Checkout Híbrido

O checkout público (`/c/:slug`) detecta o CEP do cliente e roteia automaticamente entre os providers:

1. Cliente acessa `https://seudominio.com/c/nome-do-checkout`
2. Preenche dados pessoais e CEP
3. O sistema verifica cobertura nos providers na ordem de prioridade configurada
4. Se provider COD disponível → pedido COD (paga na entrega)
5. Se nenhum COD disponível → fallback para Coinzz + Correios (paga online)

**Prioridade configurável**: Cada checkout pode definir a ordem: `logzz → hyppe → coinzz` ou qualquer combinação.

**Tabelas**: `checkouts`, `offers`, `products`, `product_variations`, `order_bumps`

### 3.2 Kanban de Pedidos

Painel visual estilo Kanban com colunas por status:
- Pendente → Agendado → Em Rota → Entregue
- Frustrado / Cancelado / Devolvido

**Realtime**: Usa Supabase Realtime para atualizar sem refresh.
**Webhooks**: Logzz, Hyppe e Coinzz enviam atualizações de status via webhook.

**Tabelas**: `orders`, `order_status_history`

### 3.3 Automação WhatsApp

Fluxos automáticos de mensagens baseados em eventos de pedido:
- Confirmação de pedido
- Pedido em rota
- Pedido entregue
- Follow-up pós-entrega
- Remarketing de frustrados

**Providers suportados**: Evolution API, Meta Cloud API (WhatsApp Business)

**Tabelas**: `flows`, `flow_executions`, `flow_templates`, `message_queue`, `whatsapp_instances`

### 3.4 Remarketing de Vendas Frustradas

Módulo dedicado para recuperação de vendas com status "Frustrado":

| Dia | Horário | Ação |
|-----|---------|------|
| D1 | 19:00 | Primeira mensagem de recuperação |
| D2 | 19:30 | Follow-up com urgência |
| D5 | 19:00 | Oferta com desconto |
| D10 | 20:00 | Último aviso com desconto maior |
| D15 | 18:00 | Reativação com promoção exclusiva |
| D25 | 19:00 | Última tentativa |

**Funcionalidades**:
- Desconto progressivo (fixo ou percentual)
- Link de checkout personalizado no WhatsApp
- Detecção automática do provider (Logzz/Coinzz/Hyppe)
- Dashboard de performance (taxa de conversão, receita recuperada)
- Variáveis dinâmicas: `{{cliente_nome}}`, `{{produto}}`, `{{checkout_link}}`, `{{cupom}}`, `{{desconto_valor}}`

**Tabelas**: `remarketing_campaigns`, `remarketing_steps`, `remarketing_enrollments`

### 3.5 Disparos em Massa

Campanhas de WhatsApp para toda a base de leads:
- Segmentação por status, tags e comportamento
- Templates personalizados
- Agendamento de envio
- Relatório de entrega

**Tabelas**: `campaigns`, `leads`

### 3.6 Flow Builder Visual

Editor drag & drop para criação de fluxos de automação:
- Nós: Trigger, Mensagem, Delay, Condição
- IA Generator: Gera fluxos completos automaticamente
- Templates oficiais pré-configurados

**Tabelas**: `flows`, `flow_executions`
**Library**: `@xyflow/react` (React Flow)

### 3.7 Vozes IA

Clone de voz e geração de áudio personalizado:
- Clone de voz via ElevenLabs
- Geração de áudio com texto personalizado
- Biblioteca de vozes disponíveis
- Sistema de tokens para consumo

**Tabelas**: `voices`, `voice_tokens`

### 3.8 Leads / CRM

Gestão completa de leads:
- Captura automática no checkout
- Tags e segmentação
- Histórico de pedidos
- Receita acumulada por lead
- Constraint de unicidade: `(user_id, phone)`

**Tabelas**: `leads`

### 3.9 Pixel Analytics

Tracking completo de eventos:
- Facebook Pixel (client-side)
- Meta Conversion API (server-side via Edge Function)
- Google Ads / Google Analytics
- UTM tracking em todos os pedidos
- Eventos: PageView, AddToCart, InitiateCheckout, Purchase

**Tabelas**: `pixel_events`

### 3.10 Admin Panel

Painel administrativo com:
- Overview de métricas globais
- Gestão de assinantes (bloquear, alterar plano, tokens)
- Gestão de planos e preços
- Logs de ações administrativas
- Configuração da landing page

**Acesso**: Via `user_roles` com role `superadmin`

### 3.11 Equipe & Permissões

Sistema de equipe com convites:
- Convite por e-mail
- Papéis: `admin` e `member`
- `get_effective_user_id()`: Membros acessam dados do owner
- Audit log de ações da equipe

**Tabelas**: `team_members`, `team_invites`, `team_audit_logs`

### 3.12 Planos & Assinaturas

Integração com MercadoPago:
- Planos com preço mensal/anual
- Trial de 7 dias
- Limites por plano (checkouts, fluxos, etc.)
- Webhooks de pagamento automáticos

**Tabelas**: `plans`, `subscriptions`, `subscription_invoices`, `token_packs`, `token_purchases`

---

## 4. Banco de Dados

### 45 Tabelas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis de usuários (nome, email, plano, tokens) |
| `user_roles` | Papéis de usuário (superadmin) |
| `orders` | Pedidos (dados do cliente, status, tracking, UTMs) |
| `order_status_history` | Histórico de mudanças de status |
| `checkouts` | Configuração de checkouts (slug, pixel, provider priority) |
| `offers` | Ofertas vinculadas a produtos |
| `products` | Produtos cadastrados |
| `product_variations` | Variações de produtos (tamanho, cor) |
| `order_bumps` | Order bumps vinculados a ofertas |
| `leads` | Leads capturados no checkout |
| `flows` | Fluxos de automação (nodes, edges, triggers) |
| `flow_executions` | Log de execuções de fluxos |
| `flow_templates` | Templates de mensagens Meta |
| `campaigns` | Campanhas de disparos em massa |
| `conversations` | Conversas WhatsApp |
| `messages` | Mensagens individuais |
| `conversation_notes` | Notas em conversas |
| `message_queue` | Fila de mensagens para envio |
| `remarketing_campaigns` | Campanhas de remarketing |
| `remarketing_steps` | Steps das campanhas (D1, D2...) |
| `remarketing_enrollments` | Pedidos inscritos no funil |
| `integrations` | Configurações de integrações (Logzz, Coinzz, Hyppe) |
| `whatsapp_instances` | Instâncias WhatsApp conectadas |
| `voices` | Vozes clonadas (ElevenLabs) |
| `voice_tokens` | Saldo de tokens de voz |
| `plans` | Planos disponíveis |
| `subscriptions` | Assinaturas ativas |
| `subscription_invoices` | Faturas de assinatura |
| `token_packs` | Pacotes de tokens disponíveis |
| `token_purchases` | Compras de tokens |
| `notifications` | Notificações do sistema |
| `notification_preferences` | Preferências de notificação |
| `pixel_events` | Eventos de pixel tracking |
| `api_tokens` | Tokens de API do usuário |
| `webhooks_config` | Configuração de webhooks |
| `stores` | Lojas do usuário |
| `home_settings` | Configurações da landing page |
| `system_config` | Configurações do sistema |
| `team_members` | Membros da equipe |
| `team_invites` | Convites pendentes |
| `team_audit_logs` | Logs de auditoria da equipe |
| `quick_replies` | Respostas rápidas do chat |
| `admin_action_logs` | Logs de ações administrativas |
| `rate_limit_attempts` | Controle de rate limit |
| `usage_limits` | Limites de uso por usuário |

### Row Level Security (RLS)

Todas as tabelas possuem RLS ativado. Padrões:
- Usuários só acessam seus próprios dados (`auth.uid() = user_id`)
- Membros da equipe acessam dados do owner via `get_effective_user_id()`
- Superadmins têm acesso total via `has_role(auth.uid(), 'superadmin')`
- Checkouts ativos são públicos para leitura (checkout público)

### Functions do Banco

| Function | Descrição |
|----------|-----------|
| `get_effective_user_id()` | Retorna owner_id para membros da equipe, ou auth.uid() |
| `has_role(uuid, app_role)` | Verifica se o usuário tem um papel específico |
| `has_active_subscription()` | Verifica se tem assinatura ativa ou trial |
| `get_user_plan_limit(feature)` | Retorna o limite do plano para uma feature |
| `check_checkout_limit()` | Trigger: valida limite de checkouts do plano |
| `check_flow_limit()` | Trigger: valida limite de fluxos do plano |
| `handle_new_user()` | Trigger: cria profile ao registrar |
| `debit_voice_tokens(uuid, int)` | Debita tokens de voz |
| `add_tokens_to_user(uuid, int)` | Adiciona tokens |
| `admin_block_user(uuid, bool)` | Admin: bloqueia/desbloqueia usuário |
| `admin_update_user_plan(uuid, uuid)` | Admin: altera plano |
| `admin_add_tokens(uuid, int, text)` | Admin: adiciona tokens |
| `admin_remove_tokens(uuid, int, text)` | Admin: remove tokens |
| `check_rate_limit(...)` | Controle de rate limit |

---

## 5. Edge Functions

### Lista completa (30+ functions)

| Function | Método | Descrição |
|----------|--------|-----------|
| `checkout-api` | POST | API principal do checkout público (criar pedido, verificar CEP) |
| `logzz-webhook` | POST | Webhook para receber atualizações de status da Logzz |
| `hyppe-webhook` | POST | Webhook para receber atualizações da Hyppe |
| `coinzz-webhook` | POST | Webhook para receber atualizações da Coinzz |
| `logzz-create-order` | POST | Criar pedido na Logzz |
| `hyppe-create-order` | POST | Criar pedido na Hyppe |
| `logzz-list-products` | GET | Listar produtos da Logzz |
| `hyppe-list-products` | GET | Listar produtos da Hyppe |
| `coinzz-list-products` | GET | Listar produtos da Coinzz |
| `trigger-flow` | POST | Dispara fluxos baseados em eventos de pedido |
| `execute-flow` | POST | Executa um fluxo específico |
| `send-whatsapp-message` | POST | Envia mensagem via WhatsApp |
| `send-template-message` | POST | Envia template message via Meta API |
| `whatsapp-webhook` | POST | Recebe mensagens do WhatsApp |
| `process-message-queue` | POST | Processa fila de mensagens (cron 5min) |
| `process-remarketing` | POST | Processa campanhas de remarketing (cron 1h) |
| `delivery-reminders` | POST | Envia lembretes de entrega (cron diário 8h) |
| `expire-unpaid-orders` | POST | Expira pedidos não pagos (cron 1h) |
| `clear-message-queue` | POST | Limpa mensagens antigas da fila |
| `ai-flow-generator` | POST | Gera fluxos com IA |
| `clone-voice` | POST | Clona voz via ElevenLabs |
| `generate-audio` | POST | Gera áudio via ElevenLabs |
| `list-voice-library` | GET | Lista vozes disponíveis |
| `pixel-event` | POST | Registra evento de pixel (CAPI) |
| `fb-capi` | POST | Envia evento para Facebook CAPI |
| `evolution-instance` | POST | Gerencia instância Evolution API |
| `meta-templates` | GET | Lista templates Meta WhatsApp |
| `create-payment` | POST | Cria pagamento MercadoPago |
| `create-mp-plans` | POST | Cria planos no MercadoPago |
| `mp-payment-webhook` | POST | Webhook de pagamento MP |
| `mp-subscription-webhook` | POST | Webhook de assinatura MP |
| `mp-invoice-webhook` | POST | Webhook de fatura MP |
| `mp-token-webhook` | POST | Webhook de compra de tokens |
| `check-payment-status` | GET | Verifica status de pagamento |
| `purchase-tokens` | POST | Compra tokens de voz |
| `team-invite` | POST | Envia convite de equipe |
| `test-integration` | POST | Testa integração (Logzz/Coinzz/Hyppe) |
| `seed-default-flows` | POST | Seed de fluxos padrão |
| `execute-campaign` | POST | Executa campanha de disparos |

---

## 6. Cron Jobs

| Job | Schedule | Descrição |
|-----|----------|-----------|
| `process-message-queue-every-5min` | `*/5 * * * *` | Processa fila de mensagens WhatsApp a cada 5 min |
| `delivery-reminders-daily` | `0 8 * * *` | Envia lembretes de entrega às 8h |
| `expire-unpaid-orders-hourly` | `0 * * * *` | Expira pedidos não pagos a cada hora |
| `process-remarketing-hourly` | `0 * * * *` | Processa campanhas de remarketing a cada hora |

---

## 7. Autenticação & Autorização

### Autenticação
- **Email + Senha**: Cadastro e login padrão
- **Verificação de e-mail**: Obrigatória (não é auto-confirm)
- **Reset de senha**: Via link por e-mail

### Autorização
- **RLS (Row Level Security)**: Todas as tabelas protegidas
- **user_roles**: Tabela separada para roles (`superadmin`)
- **team_members**: Sistema de equipe com owner/membro
- **Plan limits**: Limites de features por plano via `get_user_plan_limit()`

### Fluxo de acesso
```
Usuário → Auth (login) → profile.plan_id → plans.limits → features permitidas
                        → user_roles → superadmin? → admin panel
                        → team_members → é membro? → acessa dados do owner
```

---

## 8. Integrações Externas

| Serviço | Uso | Config |
|---------|-----|--------|
| **Logzz** | Logística COD | Token na tabela `integrations` |
| **Coinzz** | Logística Correios | Token na tabela `integrations` |
| **Hyppe** | Logística COD | Token na tabela `integrations` |
| **MercadoPago** | Pagamentos e assinaturas | Secret `MP_PLATFORM_ACCESS_TOKEN` |
| **ElevenLabs** | Clone de voz e TTS | Secret `ELEVENLABS_API_KEY` |
| **Meta/WhatsApp** | WhatsApp Business API | Token na tabela `integrations` |
| **Evolution API** | WhatsApp não-oficial | URL + Token na tabela `integrations` |
| **Facebook CAPI** | Conversion API server-side | Token por checkout |

---

## 9. Páginas & Rotas

### Páginas Públicas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Home | Landing page principal |
| `/funcionalidades` | Funcionalidades | Grid de recursos |
| `/planos` | Planos | Tabela de preços |
| `/faq` | FAQ | Perguntas frequentes |
| `/ajuda` | Ajuda | Central de suporte |
| `/status` | Status | Saúde dos serviços |
| `/termos` | Termos | Termos de uso |
| `/c/:slug` | Checkout | Checkout público |
| `/login` | Login | Tela de login |
| `/register` | Register | Tela de cadastro |
| `/forgot-password` | Forgot | Recuperação de senha |
| `/reset-password` | Reset | Nova senha |
| `/accept-invite` | Invite | Aceitar convite de equipe |

### Páginas Autenticadas (App)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/dashboard` | Dashboard | Painel principal com métricas |
| `/checkouts` | Checkouts | Gestão de checkouts |
| `/pedidos` | Pedidos | Kanban de pedidos |
| `/leads` | Leads | CRM de leads |
| `/conversas` | Conversas | Chat WhatsApp |
| `/fluxos` | Fluxos | Fluxos + Remarketing |
| `/vozes` | Vozes | Vozes IA |
| `/disparos` | Disparos | Disparos em massa |
| `/whatsapp-cloud` | WhatsApp | Configuração WhatsApp |
| `/configuracoes` | Config | Configurações gerais |
| `/suporte` | Suporte | Canal de suporte |
| `/upgrade` | Upgrade | Upgrade de plano |
| `/subscription` | Assinatura | Detalhes da assinatura |

### Páginas Admin

| Rota | Página | Descrição |
|------|--------|-----------|
| `/admin` | Overview | Métricas globais |
| `/admin/assinantes` | Assinantes | Gestão de usuários |
| `/admin/planos` | Planos | Gestão de planos |
| `/admin/cobrancas` | Cobranças | Faturas e pagamentos |
| `/admin/tokens` | Tokens | Gestão de tokens |
| `/admin/integracoes` | Integrações | Config de integrações |
| `/admin/home` | Home | Editor da landing page |
| `/admin/logs` | Logs | Logs administrativos |

---

## 10. Variáveis de Ambiente

### Frontend (.env — auto-gerado)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxxxx
```

### Secrets (Edge Functions)
```
SUPABASE_URL           # URL do projeto Supabase
SUPABASE_ANON_KEY      # Chave anon do Supabase
SUPABASE_SERVICE_ROLE_KEY  # Chave service role (admin)
SUPABASE_DB_URL        # URL de conexão do banco
SUPABASE_PUBLISHABLE_KEY
MP_PLATFORM_ACCESS_TOKEN   # Token do MercadoPago
ELEVENLABS_API_KEY     # API key do ElevenLabs
LOVABLE_API_KEY        # API key do Lovable AI
```

---

## 11. Deploy

O deploy do frontend é feito via Lovable (ou Vercel/Hostinger).
O backend (Supabase) é independente e sempre ativo.

Para deploy completo, veja o arquivo `DEPLOY-HOSTINGER.md`.
