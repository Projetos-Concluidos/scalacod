

## Plano: Corrigir persistencia do logzz_order_id nos pedidos

### Diagnostico

Investiguei os dados reais no banco. O pedido **#WL20H5LQ** (aceito pela Logzz em 03/04) tem `logzz_order_id = NULL`. Isso explica porque o link nao aparece no card.

**Causa raiz** (2 pontos de falha):

1. **`logzz-create-order`** — Quando a Logzz aceita o pedido via webhook de importacao, a resposta e `{"status":"success","message":"Webhook processado com sucesso!"}` — **sem nenhum ID de pedido**. O codigo tenta extrair `data.id`, `id`, `order_id` mas nenhum existe. Resultado: `logzz_order_id = null` e salvo no banco.

2. **`process_logzz_webhook`** — Quando a Logzz envia o webhook reverso com atualizacao de status, o `logzz_order_id` vem no body (linha 1204) mas **nunca e adicionado ao `updateFields`** (linhas 1303-1314). Ou seja, mesmo quando a Logzz finalmente informa o ID, o sistema ignora e nao persiste.

### Correcoes

**Arquivo 1: `supabase/functions/checkout-api/index.ts`** (linhas 1303-1314)

Adicionar ao bloco `updateFields` dentro de `process_logzz_webhook`:
```
if (logzz_order_id) updateFields.logzz_order_id = logzz_order_id;
```

Tambem extrair o ID de campos alternativos do payload:
```
const extractedLogzzId = logzz_order_id || webhookPayload.id || webhookPayload.order_id || null;
if (extractedLogzzId) updateFields.logzz_order_id = String(extractedLogzzId);
```

**Arquivo 2: `supabase/functions/logzz-create-order/index.ts`** (linhas 330-336)

Ampliar a extracao do ID da resposta da Logzz para cobrir mais campos possiveis:
```
logzzOrderId = parsed?.data?.id || parsed?.id || parsed?.order_id 
  || parsed?.data?.order_id || parsed?.data?.external_id || null;
```

E adicionar log quando o ID nao for encontrado para facilitar debug futuro.

### Resultado esperado
- Pedidos aceitos pela Logzz terao o `logzz_order_id` salvo assim que o webhook reverso enviar a primeira atualizacao de status
- O link clicavel `https://app.logzz.com.br/meu-pedido/{id}` aparecera no card do Kanban e no modal de detalhes

