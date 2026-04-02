

## Plano: Coinzz Webhook + Kanban Cards + Detalhes Financeiros

### Problema

1. **Webhook `coinzz-webhook` nao entende o payload real da Coinzz** — espera `body.order_hash` / `body.status`, mas a Coinzz envia `{ client: {...}, order: {"order.order_number": "...", "order.order_status": "..."}, utms: {...} }`
2. **Kanban cards nao mostram dados diferenciados** por plataforma (data agendamento so Logzz, forma pagamento so Coinzz, nome do produto, etc.)
3. **Detalhes financeiros incompletos** — nao mostra forma de pagamento, parcelas, taxa gateway
4. **Falta botao "Enviar para Coinzz"** no card/detalhe para retry manual
5. **Falta link do pedido Coinzz** similar ao link Logzz
6. **Nao salva `shipping_status` separado do `order_status`** (Coinzz envia ambos)

### Implementacao

#### 1. Reescrever `supabase/functions/coinzz-webhook/index.ts`

Parsear o payload real da Coinzz com chaves dotadas:

```typescript
// Coinzz envia: { client: { "client.client_name": "..." }, order: { "order.order_status": "..." }, utms: {...} }
const clientData = body.client || {};
const orderData = body.order || {};
const utmsData = body.utms || {};

const orderNumber = orderData["order.order_number"];
const orderStatus = orderData["order.order_status"];
const shippingStatus = orderData["order.shipping_status"];
const trackingCode = orderData["order.tracking_code"];
const courierName = orderData["order.courier_name"];
```

Buscar pedido por `order_number` (nao por `coinzz_order_hash` que pode nao existir ainda):
- Primeiro tenta `coinzz_order_hash`
- Fallback para `order_number` + `user_id`

Mapear `order_status` E `shipping_status` separadamente para o status do Kanban:
- Status de pagamento: "Aprovado" -> "Confirmado", "Cancelado" -> "Cancelado", etc.
- Status de envio: "Enviado" -> "Em Transito", "Recebido" -> "Entregue", etc.

Salvar dados adicionais no pedido: `tracking_code`, `delivery_man`, `payment_method`, UTMs.

#### 2. Migracao SQL

Adicionar colunas para dados financeiros e status separados:
- `coinzz_payment_status` (text) — status de pagamento da Coinzz
- `coinzz_shipping_status` (text) — status de envio da Coinzz  
- `total_installments` (integer) — parcelas
- `gateway_fee` (numeric) — taxa do gateway

#### 3. Redesenhar Kanban Cards em `src/pages/Pedidos.tsx`

Card mostrara:
- **Nº pedido** com link (Logzz ou Coinzz)
- **Nome cliente** em MAIUSCULO
- **Nome do produto** (do checkout name)
- **Valor do pedido**
- **Data agendamento** — SO para Logzz
- **Forma de pagamento** — SO para Coinzz (PIX, Cartao, Boleto)
- **Cidade/Estado**
- **Data/hora do pedido**

Buscar nome do checkout para exibir no card (join com checkouts via `checkout_id`).

#### 4. Botao "Enviar para Coinzz" no Kanban + Detalhe

Similar ao botao "Enviar para Logzz" existente:
- Aparece quando `logistics_type === "coinzz"` E `!coinzz_order_hash`
- Chama `checkout-api` com `action: "create_coinzz_order"`
- Icone de truck roxo no card

#### 5. Detalhes Financeiros aprimorados

Na aba "Informacoes" > secao "Financeiro":
- Forma de pagamento (PIX / Cartao / Boleto / Saldo MP / Na Entrega)
- Se parcelado, mostrar quantidade de parcelas
- Taxa do gateway (se existir)
- Status de pagamento da Coinzz (badge)
- Status de envio da Coinzz (badge)

#### 6. Link do pedido Coinzz

Na aba "Logistica", exibir link clicavel `https://app.coinzz.com.br/pedido/{hash}` (ja existe parcialmente, garantir que funciona).

### Arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/coinzz-webhook/index.ts` | **Reescrever** — parsear payload real |
| `src/pages/Pedidos.tsx` | **Editar** — cards, financeiro, botao Coinzz |
| Migracao SQL | Adicionar colunas `coinzz_payment_status`, `coinzz_shipping_status`, `total_installments`, `gateway_fee` |

### Seguranca
- Logzz permanece 100% intacta — nenhum codigo Logzz sera tocado
- Webhook continua com rate limiting (200/min)
- Validacao do `store` query param mantida
- Status history registrado para todas as mudancas

