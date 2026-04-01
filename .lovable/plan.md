

## Plano: Teste Real do Pedido #HM3DPA3W + Correção Visual do Modal

### Diagnóstico do Pedido #HM3DPA3W

Dados atuais no banco:
- **Oferta**: `salrp166` (hash de afiliado correto)
- **Order Bump**: hash `salkqmk9` (atualizado, sem mais `null`)
- **Bump product_id**: `null` — precisa ser corrigido para buscar variações
- **affiliate_email**: `null` — campo vazio
- **Endereço**: CEP 59015070, Tirol, Natal/RN
- **Entrega**: 2026-04-06

O mapeamento na Logzz já funciona (confirmado pelo teste do botão "Disparar Mapeamento"). Agora precisamos:

### Alterações

#### 1. Teste real: ação `send_to_logzz` na página Pedidos

Adicionar botão "Enviar para Logzz" na página `Pedidos.tsx` para pedidos com `logistics_type = "logzz"` e status "Aguardando". Ao clicar, chama `checkout-api` com `action: "send_to_logzz"` e `order_id`.

- Dropdown no menu de ações do pedido ou botão direto na row
- Exibe resultado (sucesso/erro) via toast
- Atualiza a lista após envio

#### 2. Correção visual do modal Step 2

O conteúdo do modal está transbordando (visível no screenshot). Causa: o `DialogContent` não tem scroll habilitado.

- Adicionar `max-h-[85vh] overflow-y-auto` ao conteúdo interno do `DialogContent`
- Garantir que o Popover do Combobox use `portal` para não ficar preso dentro do modal

#### 3. Corrigir `product_id` null no order bump `salkqmk9`

O bump tem `product_id: null`, o que impede o `logzz-create-order` de buscar variações. Precisamos:
- No `logzz-create-order`, tratar `product_id` null sem quebrar
- No Step 2 do wizard, ao importar bump da Logzz, garantir que o `product_id` é salvo na tabela `order_bumps`

### Escopo
- `src/pages/Pedidos.tsx` — botão "Enviar para Logzz"
- `src/pages/Checkouts.tsx` — scroll no modal + fix product_id no bump
- `supabase/functions/logzz-create-order/index.ts` — tratar product_id null

