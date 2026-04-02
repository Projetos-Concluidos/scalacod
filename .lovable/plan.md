

## Plano de Melhoria: Webhook Reverso Logzz → ScalaNinja

---

### Análise Comparativa — Lacunas Identificadas

Comparando o `process_logzz_webhook` atual (em `checkout-api/index.ts` linhas 974-1086) com o prompt do ScalaCOD:

| Funcionalidade | ScalaCOD | ScalaNinja | Status |
|---|---|---|---|
| Mapeamento de 30 status | Completo | Completo | OK |
| Skip se status igual | Sim | Não | **FALTA** |
| Extração delivery_date do webhook | `date_delivery.split(" ")[0]` | Não extrai | **FALTA** |
| Extração delivery_date_label | `date_delivery_day` | Não extrai | **FALTA** |
| Extração tracking_code | Sim | Não extrai | **FALTA** |
| Extração delivery_man | Sim | Não extrai | **FALTA** |
| Extração label URLs (etiquetas) | Sim | Não extrai | **FALTA** |
| Busca por order_number (fallback) | 3 tentativas | Só order_id ou logzz_order_id | **FALTA** |
| Idempotência via log | Sim | Não | **FALTA** |
| trigger-flow após mudança | Sim | Sim | OK |

### Plano de Correção

**Arquivo**: `supabase/functions/checkout-api/index.ts` (action `process_logzz_webhook`)

#### Mudanças:

1. **Skip se status igual** — Se `fromStatus === newStatus`, retornar `200 "no_change"` sem atualizar

2. **Busca por order_number como fallback** — Após falhar por `order_id` e `logzz_order_id`, tentar `order_number` do payload

3. **Extrair campos do payload do webhook**:
   - `delivery_date`: de `payload.date_delivery?.split(" ")[0]` ou `payload.delivery_date`
   - `delivery_date_label`: de `payload.date_delivery_day`
   - `tracking_code`: de `payload.tracking_code`
   - `delivery_man`: de `payload.delivery_man`
   - `logistic_operator`: de `payload.logistic_operator`
   - `label_a4_url` / `label_thermal_url`: de `payload.files`

4. **Incluir campos extraídos no UPDATE do pedido** — Só atualizar campos que vieram preenchidos no payload

5. **Idempotência simples** — Antes de processar, verificar em `order_status_history` se já existe registro com mesmo `order_id + to_status + source="logzz_webhook"` nos últimos 5 minutos

Sem migração necessária — todas as colunas já existem na tabela `orders`.

