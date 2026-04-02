

## Plano: Cartão de Crédito para Tokens + Dashboard de Vendas Admin

### 3 Entregas

---

### 1. Ativar Pagamento por Cartão de Crédito (MercadoPago Bricks)

**Problema**: O botão "Cartão" no modal de compra de tokens está desabilitado com aviso "em breve".

**Solução**: Usar o mesmo padrão do `CheckoutPublic.tsx` — carregar o SDK MercadoPago Bricks e renderizar o formulário `cardPayment` dentro do modal.

**Alterações em `src/pages/Vozes.tsx`**:
- Buscar a `MP_PUBLIC_KEY` do tenant da tabela `system_config` (chave `integration_mp_public_key`) ou `integrations` tipo `mercadopago`
- Quando o usuário selecionar "Cartão", renderizar o container `cardPaymentBrick_container` no modal
- Inicializar `MercadoPago Bricks` com a public key da plataforma (do `system_config` chave `mp_public_key`)
- No callback `onSubmit` do Bricks, chamar `purchase-tokens` passando `paymentMethod: "credit_card"` e `cardToken`
- Remover o aviso "em breve" e habilitar o botão
- Carregar o script `https://sdk.mercadopago.com/js/v2` no `<head>` via `index.html` ou dinamicamente

**Edge function `purchase-tokens`**: Já suporta `credit_card` com `cardToken` — não precisa de alteração.

---

### 2. Dashboard Admin — Vendas de Tokens (`AdminTokens.tsx` reescrita)

**Problema**: A página `/admin/tokens` só mostra consumo por usuário, sem dados de vendas/compras.

**Solução**: Redesenhar com 2 abas: **Vendas** e **Consumo**.

**Aba "Vendas"** (nova):
- Cards de métricas: Receita Total (R$), Total de Vendas, Vendas Pagas, Vendas Pendentes
- Tabela com dados da `token_purchases`: usuário, pack, tokens, valor, método de pagamento, status (badge colorido: pago/pendente/falhou), data
- Filtro por status e busca por nome/email
- Busca `token_purchases` + join com `profiles` para nome/email

**Aba "Consumo"** (existente, melhorada):
- Cards: Total Adquirido (compras + admin), Total Consumido, Taxa de Uso
- Tabela por usuário: nome, email, comprados, admin (créditos manuais), usados, saldo
- Separar tokens de compras (`token_purchases` status=paid) vs créditos admin (`admin_action_logs` action=add_tokens)

---

### 3. Detalhes Técnicos

**Busca da Public Key MP**:
- A plataforma usa `MP_PLATFORM_ACCESS_TOKEN` como secret para cobranças
- Para o Bricks SDK no frontend, precisa da **public key** correspondente
- Buscar de `system_config` (chave `mp_public_key`) — se não existir, será necessário adicionar via painel admin de integrações
- Alternativa: usar a mesma public key que o checkout do tenant busca de `integrations` tipo `mercadopago`

**Migração**: Nenhuma — tabela `token_purchases` já tem todos os campos necessários.

### Escopo
- 2 arquivos editados: `src/pages/Vozes.tsx`, `src/pages/admin/AdminTokens.tsx`
- Possível: adicionar script MP SDK em `index.html` (já existe para checkout)
- Sem migrações, sem edge functions novas

