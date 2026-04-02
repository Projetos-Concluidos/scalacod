

## Plano: Remover campo E-mail do Checkout e Pedidos

O campo de e-mail será removido do formulário público, do envio de dados, e da exibição nos pedidos. Campos de e-mail em outras áreas (Leads, Admin, Auth) serão mantidos pois são funcionais.

---

### Alterações

#### 1. `src/pages/CheckoutPublic.tsx`
- Remover `email: ""` do state `form`
- Remover o campo `<Label>E-mail</Label>` + `<Input>` do formulário (tanto no fluxo multi-step quanto no Express)
- Remover `client_email: form.email` do payload enviado ao checkout-api
- Substituir `form.email` no payer do MercadoPago por string fixa `"comprador@checkout.com"` (campo obrigatório da API MP)
- Remover `email: form.email` do payload do pixel/CAPI

#### 2. `src/pages/Pedidos.tsx`
- Remover a linha que exibe `o.client_email` nos detalhes do pedido

#### 3. `supabase/functions/checkout-api/index.ts`
- Manter `client_email` no insert do banco como `null` (não quebra nada, coluna já é nullable)
- Substituir `order_data.email` no payer do MP por fallback fixo `"comprador@checkout.com"`

**Nota**: A coluna `client_email` na tabela `orders` e `email` na tabela `leads` serão mantidas no banco (nullable) para não exigir migração destrutiva. Apenas o frontend deixa de coletar e exibir.

