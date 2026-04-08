

## Plano: Criar Webhook Dedicado da Logzz + Atualizar Pedido #HN3SG6S8

### Diagnóstico

O problema é claro: **não existe um endpoint dedicado para a Logzz enviar atualizações de status**. A lógica `process_logzz_webhook` existe dentro do `checkout-api`, mas requer autenticação e um body específico com `action: "process_logzz_webhook"`. A Logzz não consegue chamar isso automaticamente.

A Hyppe já tem um webhook dedicado (`hyppe-webhook`), mas a Logzz não tem equivalente.

### Implementação

**1. Criar Edge Function `logzz-webhook/index.ts`**
- Endpoint público que a Logzz pode chamar: `{SUPABASE_URL}/functions/v1/logzz-webhook?store={user_id}`
- Mesmo padrão do `hyppe-webhook`: recebe payload, mapeia status, atualiza pedido, registra timeline, dispara `trigger-flow`
- Busca o pedido por `logzz_order_id`, `order_number` ou `external_id`
- Extrai campos extras: `tracking_code`, `delivery_man`, `logistic_operator`, URLs de etiquetas

**2. Exibir URL do webhook na aba Logzz (Configurações)**
- Adicionar a URL do webhook reverso na interface de configuração da Logzz para que o assinante possa copiar e configurar na plataforma Logzz

**3. Atualizar pedido #HN3SG6S8 manualmente**
- Chamar `process_logzz_webhook` via `checkout-api` para atualizar o pedido de "Agendado" → "Separado"
- Isso também dispara o `trigger-flow` para enviar mensagem ao cliente

### Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/logzz-webhook/index.ts` | Criar (novo endpoint) |
| `src/pages/Configuracoes.tsx` ou aba Logzz | Exibir webhook URL |
| Chamada manual via curl | Atualizar pedido #HN3SG6S8 |

### Impacto
- Zero alteração no fluxo existente
- Apenas adiciona o endpoint que faltava para a Logzz enviar atualizações automaticamente

