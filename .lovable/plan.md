
## Plano: Transformar "Leads Recentes" em "Vendas Recentes"

### O que muda

A seção lateral do Dashboard será completamente reformulada:
- **Titulo**: "Leads Recentes" → "Vendas Recentes"
- **Fonte de dados**: Em vez de buscar da tabela `leads`, buscar da tabela `orders` (pedidos recentes)
- **Informações exibidas por card**:
  - Nome do cliente + telefone
  - Numero do pedido (ex: #HN3SG6S8)
  - Valor do pedido formatado (R$)
  - Badge do provider: **Logzz** (laranja), **Hyppe** (roxo), **Coinzz** (azul)
  - Badge do status do pedido (colorido conforme status)
  - Data/hora do pedido
- **Ação ao clicar**: Navegar para `/pedidos` (pagina de pedidos) para ver detalhes
- **"Ver Todos"**: Link para `/pedidos`

### Arquivo modificado

| Arquivo | Alteracao |
|---|---|
| `src/pages/Dashboard.tsx` | Query `orders` em vez de `leads`, novo layout dos cards com badges e detalhes |

### Implementacao

1. **Query**: Trocar `supabase.from("leads")` por `supabase.from("orders")` com campos: `id, order_number, client_name, client_phone, order_final_price, status, logistics_type, created_at` — limit 5, order by `created_at desc`
2. **State**: Trocar `recentLeads` por `recentOrders` (tipado)
3. **Card redesign**: Cada card mostra avatar com inicial, nome, telefone, numero do pedido, valor em destaque, badge do provider (Logzz/Hyppe/Coinzz) e badge do status
4. **Click handler**: `navigate('/pedidos')` ao clicar no card
5. **Empty state**: Trocar icone Users por ShoppingCart e texto para "Nenhuma venda ainda"

### Impacto
- Zero impacto em outras funcionalidades
- Apenas altera a seção lateral direita do Dashboard
