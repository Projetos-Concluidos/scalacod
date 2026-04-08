## Módulo de Remarketing — Plano Completo

### 1. Database (Migration)

**Tabela `remarketing_campaigns`** — Configuração das campanhas
- `user_id`, `name`, `description`, `is_active`
- `trigger_status` (ex: "Frustrado", "Cancelado")
- `flow_type` (logzz, coinzz, hyppe ou all)
- `checkout_id` (link do checkout para enviar nas mensagens)
- `discount_enabled`, `discount_type` (percentage/fixed), `discount_progressive` (boolean)
- `total_enrolled`, `total_converted`, `total_revenue_recovered`

**Tabela `remarketing_steps`** — Cadência dos disparos
- `campaign_id`, `step_order` (1,2,3...)
- `delay_days` (D1, D2, D5, D10, D15, D25)
- `send_hour` (19:00, 19:30, 20:00...)
- `message_template` (texto com variáveis {{cliente_nome}}, {{produto}}, {{checkout_link}}, {{cupom}}, {{desconto_valor}})
- `discount_value` (desconto específico deste step, ex: 5%, 10%, 15%)

**Tabela `remarketing_enrollments`** — Pedidos que entraram no funil
- `campaign_id`, `order_id`, `user_id`
- `enrolled_at`, `current_step` (qual step está)
- `status` (active, converted, cancelled, completed)
- `converted_at`, `converted_order_id`

### 2. Edge Function `process-remarketing`
- Chamada via cron a cada hora
- Busca enrollments ativos onde o próximo step está no horário
- Verifica se o pedido ainda está frustrado (safety check)
- Interpola variáveis: `{{cliente_nome}}`, `{{produto}}`, `{{checkout_link}}`, `{{cupom}}`, `{{desconto_valor}}`
- Insere na `message_queue` para envio via WhatsApp
- Atualiza `current_step` do enrollment

### 3. Enrollment automático via `trigger-flow`
- Quando um pedido muda para status "Frustrado", verificar se existe campanha de remarketing ativa
- Criar enrollment automaticamente

### 4. UI — Nova aba "Remarketing" na página Fluxos
- **Lista de campanhas** com cards mostrando: nome, status, enrolled/converted, taxa de conversão
- **Criar/Editar campanha**: formulário com nome, trigger, checkout vinculado, tipo de desconto
- **Timeline visual**: timeline horizontal mostrando cada step (D1, D2, D5...) com horário e preview da mensagem
- **Editor de mensagem por step**: textarea com variáveis disponíveis
- **Dashboard mini**: total enrolled, converted, taxa de conversão, receita recuperada

### 5. Arquivos modificados/criados

| Arquivo | Ação |
|---|---|
| Migration SQL | 3 tabelas novas |
| `src/pages/Fluxos.tsx` | Adicionar aba "Remarketing" |
| `src/components/remarketing/RemarketingTab.tsx` | Lista + dashboard |
| `src/components/remarketing/RemarketingCampaignForm.tsx` | Criar/editar campanha |
| `src/components/remarketing/RemarketingTimeline.tsx` | Timeline visual dos steps |
| `src/components/remarketing/RemarketingStepEditor.tsx` | Editor de mensagem por step |
| `supabase/functions/process-remarketing/index.ts` | Processamento dos disparos |
| `supabase/functions/trigger-flow/index.ts` | Auto-enrollment |

### 6. Impacto
- Zero impacto em fluxos existentes
- Remarketing é um módulo independente
- Usa a `message_queue` existente para envio