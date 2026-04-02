

## Plano: Integração Coinzz — POST /api/sales

### Problema Atual

O bloco `create_coinzz_order` no `checkout-api/index.ts` (linhas 412-468) está **completamente errado**:

| Item | Atual (quebrado) | Correto (API Coinzz) |
|---|---|---|
| Endpoint | `POST /api/orders` | `POST /api/sales` |
| Payload | `{ customer, shipping, items, total }` | `{ offer_hash, payment_method, customer: { name, email, document, phone, address: {...} } }` |
| Proteção HTML | Nenhuma | `redirect: "manual"` + validação content-type |
| Envio automático | Não acontece | Após `create_order` quando `logistics_type === "coinzz"` |

Além disso, **não existe webhook** para receber atualizações de pedidos da Coinzz.

### Implementação

#### 1. Corrigir `create_coinzz_order` no checkout-api (linhas 412-468)

Reescrever o bloco para usar `POST https://app.coinzz.com.br/api/sales` com o payload correto:

```typescript
// Payload conforme documentação oficial
{
  offer_hash: order_data.coinzz_offer_hash,
  payment_method: "afterpay", // COD
  customer: {
    name: order_data.name,
    email: order_data.email || "cliente@scalacod.com",
    document: order_data.document,
    phone: order_data.phone,
    address: {
      zip_code: order_data.cep,
      street: order_data.address,
      number: order_data.address_number,
      complement: order_data.complement || "",
      neighborhood: order_data.district,
      city: order_data.city,
      state: order_data.state,
    }
  },
  shipping_value: order_data.shipping_value || 0,
  order_bumps: order_data.coinzz_bumps || [],
}
```

Incluir `redirect: "manual"` e validação de content-type antes de parsear JSON.

#### 2. Envio automático no `create_order` (após linha 297)

Adicionar bloco `else if (logistics_type === "coinzz")` que:
1. Busca a integração Coinzz do tenant
2. Busca o `offer_hash` da oferta (campo `hash` na tabela `offers`)
3. Chama `POST /api/sales` com os dados do pedido
4. Salva `coinzz_order_hash` da resposta no pedido
5. Log de sucesso/erro

**SEGURANÇA**: O bloco Logzz (linhas 274-297) NÃO será tocado. O novo bloco será um `else if` separado.

#### 3. Criar Edge Function `coinzz-webhook`

Nova função `supabase/functions/coinzz-webhook/index.ts` para receber callbacks:
- Identificar pedido por `coinzz_order_hash`
- Mapear status Coinzz → ScalaCOD
- Atualizar pedido + inserir `order_status_history`
- Disparar `trigger-flow` para automações
- Rate limiting + validação do `store` query param

#### 4. Migração SQL

Adicionar campo `coinzz_offer_hash` na tabela `checkouts` para que o tenant configure qual oferta da Coinzz usar por checkout (opcional, pode usar o `hash` da oferta existente).

### Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/checkout-api/index.ts` | Corrigir `create_coinzz_order` + envio automático no `create_order` |
| `supabase/functions/coinzz-webhook/index.ts` | **Criar** |
| Migração SQL | Adicionar `coinzz_offer_hash` em `checkouts` |

### Segurança
- Logzz permanece 100% intacta
- Validação de content-type antes de JSON.parse
- `redirect: "manual"` para evitar HTML redirects
- Rate limiting no webhook

