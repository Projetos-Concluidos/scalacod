## Plano: Integração Coinzz — POST /api/sales

### Problema Atual
O `create_coinzz_order` no `checkout-api/index.ts` (linha 431) usa:
- **Endpoint errado**: `https://app.coinzz.com.br/api/orders` → retorna HTML (erro de redirect)
- **Payload errado**: estrutura `{ customer, shipping, items, total }` que não existe na API Coinzz
- **Não é chamado automaticamente**: quando `logistics_type === "coinzz"`, o pedido é criado no banco mas NUNCA enviado à Coinzz

### O que será feito

#### 1. Corrigir `create_coinzz_order` no checkout-api

Atualizar para usar a API oficial documentada:

| De (atual) | Para (correto) |
|---|---|
| `POST /api/orders` | `POST /api/sales` |
| `{ customer, shipping, items, total }` | `{ offer_hash, payment_method: "afterpay", customer: { name, email, document, phone, address: {...} }, shipping_value }` |
| Sem validação de HTML | `redirect: "manual"` + validação content-type |

O payload seguirá exatamente a documentação fornecida, usando `payment_method: "afterpay"` (COD) como padrão para pedidos Coinzz.

#### 2. Envio automático após criação do pedido

No bloco `create_order`, quando `logistics_type === "coinzz"`, chamar a Coinzz automaticamente (igual já faz com Logzz na linha 276). O fluxo:

1. Pedido inserido no banco → recebe `order_id`
2. Buscar integração Coinzz do tenant
3. Buscar `offer_hash` da oferta vinculada ao checkout
4. Montar payload `/api/sales` com dados do pedido
5. Enviar à Coinzz → receber `order_hash` da resposta
6. Salvar `coinzz_order_hash` no pedido

#### 3. Criar webhook `coinzz-webhook` (receber atualizações)

Nova Edge Function `supabase/functions/coinzz-webhook/index.ts` para receber callbacks da Coinzz quando o status do pedido mudar. Fluxo:
- Recebe POST com dados do pedido
- Busca pedido por `coinzz_order_hash`
- Atualiza status + tracking_code
- Dispara `trigger-flow` para automações

#### 4. Configurar `offer_hash` no checkout

O checkout precisa saber qual `offer_hash` da Coinzz usar. Adicionar campo `coinzz_offer_hash` na tabela `checkouts` (ou usar o `hash` da oferta existente se for da Coinzz).

### Segurança
- Logzz NÃO será alterada — nenhuma linha do fluxo Logzz será tocada
- O bloco `create_coinzz_order` existente será reescrito IN-PLACE
- O novo envio automático será um bloco `else if` separado do bloco Logzz

### Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/checkout-api/index.ts` | Corrigir `create_coinzz_order` (linhas 412-468) + adicionar envio automático no `create_order` |
| `supabase/functions/coinzz-webhook/index.ts` | **Criar** — webhook para receber atualizações de pedidos |
| Migração SQL | Adicionar `coinzz_offer_hash` na tabela `checkouts` (se necessário) |

### Fluxo Final

```text
Cliente → Checkout → CEP sem cobertura Logzz
  → provider = "coinzz"
  → Pagamento via MercadoPago (PIX/Cartão)
  → create_order (banco)
  → POST /api/sales (Coinzz) com offer_hash + afterpay
  → Salva coinzz_order_hash
  → Coinzz processa → webhook → atualiza status
```
