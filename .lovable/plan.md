

## Relatório: Correção da Data de Entrega Logzz (Erro 422)

---

### Situação Atual

**Causa raiz do erro 422**: `"A data de entrega não corresponde ao mapeamento"`

O fluxo atual tem 2 problemas:

1. **`type_code` não é salvo**: A API da Logzz retorna `dates_available` com campos `date`, `type_code`, `type_name` e `price`. Nosso sistema extrai apenas `{ date, type, price }` — descartando o `type_code` que identifica o tipo de entrega (ex: `det6p915` = Express, `det1pgz5` = Padrão). Sem esse código, a Logzz não consegue mapear a entrega.

2. **`delivery_type_code` e `delivery_type_name` não são persistidos**: O pedido é criado sem esses campos (que já existem na tabela `orders`), então quando o `logzz-create-order` envia o payload, faltam informações de tipo de entrega.

3. **Data pode estar expirada**: Entre o momento que o cliente vê as datas disponíveis e confirma o pedido, a data pode ter passado do horário de corte (`cutoff_time`).

---

### Plano de Correção

#### 1. `supabase/functions/checkout-api/index.ts` — Preservar `type_code` e `type_name`

Na ação `check_cep`, alterar o mapeamento de datas para incluir os campos da Logzz:

```
// Antes:
{ date: d.date, type: d.type || "Padrão", price: d.price || 0 }

// Depois:  
{ date: d.date, type: d.type_name || d.type || "Padrão", type_code: d.type_code || "", price: d.price || 0 }
```

Na ação `create_order`, salvar `delivery_type_code` e `delivery_type_name`:

```
delivery_type_code: order_data.delivery_type_code || null,
delivery_type_name: order_data.delivery_type_name || null,
```

#### 2. `src/pages/CheckoutPublic.tsx` — Enviar `type_code` e `type_name` no pedido

Atualizar a interface `DeliveryDate` para incluir `type_code`:

```
interface DeliveryDate { date: string; type: string; type_code?: string; price: number; }
```

No payload de criação do pedido, incluir:

```
delivery_type_code: selectedDate?.type_code || null,
delivery_type_name: selectedDate?.type || null,
```

#### 3. `supabase/functions/logzz-create-order/index.ts` — Enviar `delivery_type_code`

Adicionar o campo `delivery_type_code` no payload enviado à Logzz:

```
delivery_type_code: order.delivery_type_code || "",
```

Isso permite que a Logzz identifique exatamente qual tipo de entrega foi selecionado.

---

### Arquivos alterados

- `supabase/functions/checkout-api/index.ts` — Preservar `type_code`/`type_name` no check_cep e salvar no create_order
- `src/pages/CheckoutPublic.tsx` — Incluir `type_code` na interface e no payload
- `supabase/functions/logzz-create-order/index.ts` — Enviar `delivery_type_code` no payload

**Sem migrações** — as colunas `delivery_type_code` e `delivery_type_name` já existem na tabela `orders`.

