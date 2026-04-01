

## Plano de Correção: PIX + CEP Logzz

### Problema 1: Erro ao gerar PIX (RLS na tabela orders)

O checkout público usa o cliente Supabase do navegador (anon) para inserir pedidos com `supabase.from("orders").insert({...}).select("id").single()`. A policy `public_order_insert` permite INSERT anon, mas o `.select("id")` exige SELECT permission que o role `anon` **não tem** na tabela orders. Resultado: "new row violates row-level security policy for table orders".

**Correção**: Mover a criação de pedido para a edge function `checkout-api` (que usa `service_role`). Criar uma nova action `create_order` no `checkout-api` que recebe os dados do pedido e retorna o `order_id`. No `CheckoutPublic.tsx`, substituir a chamada direta ao Supabase por uma chamada à edge function.

Mesma correção para leads upsert (o upsert com `onConflict` precisa de UPDATE, que anon não tem).

### Problema 2: CEP Logzz retorna vazio

Logs mostram: `Logzz success: undefined dates: 0`. A API Logzz retorna status 200, mas o parsing espera `data.success` e `data.data.response.dates_available` — estrutura que não corresponde à resposta real. O corpo cru da resposta nunca é logado, impossibilitando debug.

**Correção**:
1. Adicionar log do corpo cru da resposta Logzz (`console.log("[CEP] Logzz raw body:", rawCep.substring(0, 500))`)
2. Tornar o parsing mais resiliente, tentando múltiplas estruturas de resposta possíveis:
   - `data.data.response.dates_available` (estrutura atual)
   - `data.response.dates_available`
   - `data.dates_available`
   - `data.data?.dates_available`
   - Array direto na raiz
3. Remover a dependência de `data.success` — verificar apenas se existem datas disponíveis

### Alterações por arquivo

**1. `supabase/functions/checkout-api/index.ts`**
- Nova action `create_order`: recebe dados do pedido, insere via service_role, faz upsert de lead, retorna `order_id`
- Fix do parsing Logzz: log raw body + parsing resiliente com múltiplas estruturas

**2. `src/pages/CheckoutPublic.tsx`**
- Substituir `createOrder()` que usa supabase client direto → chamar edge function `checkout-api` com `action: "create_order"`
- Manter toda a lógica de pixel/tracking no frontend

### Escopo controlado
- Apenas 2 arquivos: `checkout-api/index.ts` e `CheckoutPublic.tsx`
- Sem mudanças em RLS policies (a correção é server-side)
- Sem impacto em outras páginas
