## Plano: Detalhamento Completo de Pedidos + Ações no Kanban

### Visão Geral

Reescrever o modal de detalhes do pedido e o card do kanban em `src/pages/Pedidos.tsx` para incluir todas as informações solicitadas, com funcionalidades de copiar, editar, cancelar e apagar.

### Alterações (arquivo único: `src/pages/Pedidos.tsx`)

#### 1. Badge de Plataforma no Kanban Card

- Badge **LOGZZ** (verde esmeralda `bg-emerald-500`) ou **COINZZ** (roxo `bg-purple-500`) baseado em `logistics_type`
- Visível no topo de cada card ao lado do número do pedido

#### 2. Menu de Ações no "..." do Kanban Card

O botão `MoreHorizontal` ganha um `DropdownMenu` com:
- 👁️ Ver Detalhes → abre modal
- ✏️ Editar Pedido → abre modal de edição (nome, telefone, endereço)
- ❌ Cancelar Pedido → muda status para "Frustrado" + confirmação
- 🗑️ Apagar Pedido → deleta do banco + confirmação

#### 3. Tab "Informações" — Detalhes Completos

**Seção CLIENTE** (com ícone 📋 copiar ao lado de cada dado):
- Nome, Telefone (link WhatsApp), Email, CPF/CNPJ

**Seção ENDEREÇO** (com botão copiar endereço completo):
- Rua, número, complemento, bairro, cidade/UF, CEP

**Seção OFERTA / PRODUTOS** (NOVA):
- Buscar oferta via `offer_id` → nome, preço, quantidade
- Buscar order bumps via `order_bumps` table filtrado por `offer_id`
- Exibir cada bump: nome, preço, qtd
- Subtotal do pedido discriminado

**Seção FINANCEIRO** (melhorada):
- Valor do produto principal
- Valor dos order bumps (se houver)
- Frete: valor ou badge "🟢 FRETE GRÁTIS!" se R$0
- Total do pedido (destaque grande)
- Pagamento: "💵 PAGAMENTO NA ENTREGA" (logzz) ou "💳 PAGAMENTO ONLINE — ENTREGA VIA CORREIOS" (coinzz)

**Seção AGENDAMENTO** (NOVA — destaque):
- Data de entrega em fonte grande e visível
- Badge colorido com a data

#### 4. Tab "Logística" — Links Externos

- Badge plataforma (LOGZZ verde / COINZZ roxo)
- **Logzz**: link `https://app.logzz.com.br/meu-pedido/{logzz_order_id}` (já existe)
- **Coinzz**: link `https://app.coinzz.com.br/pedido/{coinzz_order_hash}` (NOVO)
- Rastreio, entregador, operador logístico, etiquetas

#### 5. Tab "Timeline" — Histórico Real

- Query `order_status_history` filtrado por `order_id`
- Exibir cada transição: de → para, data/hora, fonte (kanban_drag, logzz_webhook, etc.)
- Se não houver histórico, mostrar pelo menos criação + última atualização

#### 6. Funcionalidade de Copiar

- Componente inline `CopyButton`: ícone `Copy` (lucide) sutil ao lado do texto
- Ao clicar: `navigator.clipboard.writeText(valor)` + toast "Copiado!"
- Aplicado em: nome, telefone, email, documento, endereço completo, número do pedido

#### 7. Editar Pedido (modal simples)

- Dialog com form para editar: nome, telefone, endereço, data de entrega
- Salva via `supabase.from("orders").update(...)` 

#### 8. Cancelar / Apagar

- **Cancelar**: `AlertDialog` de confirmação → muda status para "Frustrado" + registra em `order_status_history`
- **Apagar**: `AlertDialog` de confirmação → deleta o pedido do banco

### Dados Necessários (queries adicionais no modal)

Ao abrir o modal, buscar:
1. `offers` (via `offer_id`) → nome e preço da oferta
2. `order_bumps` (via `offer_id`) → bumps vinculados
3. `order_status_history` (via `order_id`) → timeline completa

### Escopo
- 1 arquivo: `src/pages/Pedidos.tsx`
- Sem migrações, sem edge functions novas
- Todas as tabelas e colunas já existem no banco
