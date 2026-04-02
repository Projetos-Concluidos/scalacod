

## Relatório Ultra Comparativo: ScalaCOD vs ScalaNinja — 3 Prompts Logzz

---

### PROMPT 1: logzz-check-cep (Consulta de CEP)

| Funcionalidade | ScalaCOD | ScalaNinja (check_delivery) | Status |
|---|---|---|---|
| Endpoint dedicado | Edge Function separada | Action dentro de checkout-api | ✅ OK (abordagem diferente mas funcional) |
| Autenticação dupla (checkout_id OU JWT) | Sim | Não — usa user_id do body | ⚠️ DIFERENTE mas funciona (público via checkout) |
| Rate limit por tenant | RPC check_rate_limit por tenant | Rate limit global por IP | ⚠️ MENOR granularidade |
| Token via RPC criptografado | get_tenant_secret_v2 + MASTER_KEY | Direto da tabela integrations.config | ⚠️ MENOS SEGURO (token em plaintext no config) |
| API Logzz delivery-day | GET /api/delivery-day/options/zip-code/{cep} | Idêntico | ✅ OK |
| Parsing resiliente de resposta | 2 estruturas | 6 estruturas (mais robusto!) | ✅ MELHOR |
| ViaCEP + BrasilAPI fallback | Sim | Sim | ✅ OK |
| Retorna type_code/type_name | Sim | Sim (+ local_operation_code) | ✅ OK |
| Máx 5 datas | slice(0,5) | Sem limite | ⚠️ FALTA (menor prioridade) |
| Logging em webhook_logs | Sim | Não | ❌ FALTA |
| Resposta padronizada com reason | Sim (invalid_cep, not_configured, etc.) | Parcial (provider/message) | ⚠️ DIFERENTE |

**Veredicto**: Nosso check_delivery é **funcional e até mais resiliente** no parsing. Faltam: logging em webhook_logs e limite de 5 datas. Prioridade BAIXA.

---

### PROMPT 2: checkout-submit + logzz-create-order

| Funcionalidade | ScalaCOD | ScalaNinja | Status |
|---|---|---|---|
| Criação do pedido | checkout-submit separado | create_order dentro de checkout-api | ✅ OK |
| Validação campos obrigatórios | checkout_id, tenant_id, name, phone | order_data genérico | ⚠️ MENOS ESTRITO |
| Plan limit check | RPC check_plan_limit | Não tem | ❌ FALTA |
| Upsert lead + LTV | Sim | Sim (implementado!) | ✅ OK |
| Notificações in-app | INSERT notifications | Não | ❌ FALTA |
| Incrementa tenant_usage | Sim | Não | ❌ FALTA (não temos multi-tenant) |
| Incrementa conversion_count | Sim | Não | ⚠️ FALTA |
| 3 mensagens WhatsApp (Logzz) | Imediata + D-1 + D0 | Via trigger-flow (fluxos) | ✅ OK (abordagem diferente) |
| Job queue assíncrona | INSERT job_queue → process-job-queue | Chamada síncrona direta | ⚠️ DIFERENTE (síncrono pode timeout) |
| logzz-create-order payload | Apenas delivery_date | Apenas delivery_date ✅ | ✅ OK (já corrigido!) |
| Phone com prefixo 55 | Obrigatório | Não adiciona 55 | ❌ FALTA |
| State lowercase 2 letras | Obrigatório | Já faz .toLowerCase() | ✅ OK |
| Retry com exponential jitter | ScalaCOD não menciona | Sim (3 tentativas CF) | ✅ MELHOR |
| trigger-flow após Agendado | Sim | Sim (acabamos de adicionar!) | ✅ OK |
| Logging em webhook_logs | Sim | Em order_status_history | ✅ OK (diferente mas funcional) |

**Veredicto**: Faltam 2 correções importantes: **prefixo 55 no telefone** e **conversion_count**. O resto é funcional.

---

### PROMPT 3: logzz-list-products

| Funcionalidade | ScalaCOD | ScalaNinja | Status |
|---|---|---|---|
| Edge Function separada | Sim | Sim (logzz-list-products) | ✅ OK |
| Autenticação JWT | Sim | Sim | ✅ OK |
| Token via RPC criptografado | get_tenant_secret_v2 | Direto da integrations.config | ⚠️ MENOS SEGURO |
| GET /api/v1/products | Sim | Sim | ✅ OK |
| Extrai 3 roles | producer, affiliate, coproducer | Idêntico | ✅ OK |
| Extrai offer_hash | Sim | Sim | ✅ OK |
| Metadados extras (imagem, peso, etc.) | Não menciona | Sim (mais completo!) | ✅ MELHOR |
| Fallback flat array | Não menciona | Sim | ✅ MELHOR |
| Upsert no banco (sync) | Não menciona (só lista) | Sim (via sync_logzz_products) | ✅ MELHOR |

**Veredicto**: Nossa implementação é **mais completa** que o ScalaCOD neste ponto. Nenhuma correção necessária.

---

### Plano de Ação — Correções Prioritárias

#### 1. `supabase/functions/logzz-create-order/index.ts` — Prefixo 55 no telefone
- O telefone deve ter prefixo `55` para a Logzz aceitar
- Linha 212: mudar de `(order.client_phone || "").replace(/\D/g, "")` para adicionar `55` se não começar com `55`
```typescript
const rawPhone = (order.client_phone || "").replace(/\D/g, "");
const phone = rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`;
```

#### 2. `supabase/functions/checkout-api/index.ts` — Incrementar conversion_count
- Após criar o pedido com sucesso (linha ~218), incrementar o `conversion_count` do checkout
- Adicionar após o insert do lead:
```typescript
if (order_data.checkout_id) {
  await supabase.rpc("increment_field", { 
    table: "checkouts", field: "conversion_count", row_id: order_data.checkout_id 
  });
}
```
- Alternativa sem RPC: `UPDATE checkouts SET conversion_count = conversion_count + 1 WHERE id = checkout_id`

#### 3. `supabase/functions/checkout-api/index.ts` — Limitar datas a 5
- Linha 141: adicionar `.slice(0, 5)` ao map de dates

**Sem migração necessária.** Todas as colunas já existem.

---

### Resumo Executivo

| Área | Nota | Ação |
|---|---|---|
| check_delivery (CEP) | 8/10 | Limitar a 5 datas |
| create_order (Pedido) | 7/10 | Prefixo 55 + conversion_count |
| logzz-create-order | 9/10 | Prefixo 55 no phone |
| logzz-list-products | 10/10 | Nenhuma ação |
| process_logzz_webhook | 9/10 | Já corrigido na sessão anterior |

**3 arquivos a alterar:**
1. `supabase/functions/logzz-create-order/index.ts` — prefixo 55 no telefone
2. `supabase/functions/checkout-api/index.ts` — conversion_count + limite 5 datas

