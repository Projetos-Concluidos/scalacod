
## Plano: Corrigir variaveis vazias nos templates + Log visual da fila WhatsApp

### Problema 1: Variaveis `{{produto_nome}}` e `{{endereco_completo}}` vazias

**Causa raiz confirmada no banco:**
- Pedido `MLIFIVMM`: `products = {}` (vazio), mas o produto real esta em `offers → products` (nome: "Organic Lizz")
- `endereco_completo` **nao existe** no contexto `ctx` do `execute-flow` (linha 96-107) — nunca foi adicionada
- `produto_nome` extrai de `products.main.product_name` que e sempre `{}` — precisa buscar via `offer_id → offers → products`

**Dados reais no banco:**
```text
orders.offer_id → offers.product_id → products.name = "Organic Lizz"
orders.client_address = "Rua Rio Azul"
orders.client_address_number = "11"
orders.client_address_district = "Boa Viagem"
orders.client_address_city = "Recife"
orders.client_address_state = "PE"
```

### Correcao 1: `supabase/functions/execute-flow/index.ts`

**A) Buscar nome do produto via offer_id** (apos buscar order, linhas 64-73):
```typescript
let productName = (order?.products as any)?.main?.product_name || "";
if (!productName && order?.offer_id) {
  const { data: offer } = await supabase
    .from("offers")
    .select("name, products:product_id(name)")
    .eq("id", order.offer_id)
    .single();
  productName = (offer?.products as any)?.name || offer?.name || "";
}
```

**B) Montar `endereco_completo`** a partir dos campos do pedido:
```typescript
const endereco = [
  order?.client_address,
  order?.client_address_number ? `nº ${order.client_address_number}` : null,
  order?.client_address_comp,
  order?.client_address_district,
  order?.client_address_city,
  order?.client_address_state,
].filter(Boolean).join(", ");
```

**C) Adicionar ao `ctx`** (linha 96-107):
```typescript
produto_nome: productName,
endereco_completo: endereco,
```

### Problema 2: Log visual + botao limpar fila WhatsApp

Atualmente so existe um contador "Fila WhatsApp" no Dashboard. Nao ha tela de historico.

### Correcao 2: Novo componente `FilaWhatsAppTab`

Criar uma nova aba na pagina de Configuracoes (ou Disparos) com:

1. **Tabela de historico** da `message_queue`:
   - Colunas: Data, Telefone, Mensagem (truncada), Status (pending/sent/failed), Tentativas, Erro
   - Filtros: status (todos/pending/sent/failed)
   - Paginacao com limite de 50 registros

2. **Botao "Limpar Fila"**:
   - Deleta registros com `status = 'pending'` do usuario
   - Confirmacao via dialog antes de executar
   - Implementado via Edge Function `clear-message-queue` (necessario para RLS com delete)

3. **Contadores resumo** no topo:
   - Pendentes, Enviados, Falhados

### Arquivos a criar/editar

1. `supabase/functions/execute-flow/index.ts` — buscar produto via offer, montar endereco_completo
2. `src/components/settings/FilaWhatsAppTab.tsx` — novo componente de log visual
3. `src/pages/Configuracoes.tsx` — adicionar aba "Fila WhatsApp"
4. `supabase/functions/clear-message-queue/index.ts` — edge function para limpar fila
5. Migration: adicionar RLS policy de delete na message_queue para o usuario

### Resultado esperado
- Mensagens WhatsApp enviadas com produto "Organic Lizz" e endereco "Rua Rio Azul, nº 11, Boa Viagem, Recife, PE" em vez de `{{produto_nome}}` e `{{endereco_completo}}`
- Tela de historico com todos os disparos e status
- Botao para limpar fila pendente
