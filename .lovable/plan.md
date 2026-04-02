

## Plano: Mega Melhoria — Detalhes do Pedido + Ações no Kanban

### O que muda

Reescrever completamente `src/pages/Pedidos.tsx` para incluir todas as informações solicitadas, funcionalidades de ação e melhorias visuais.

---

### 1. Badge de Plataforma no Kanban Card

Cada card exibirá um badge colorido ao lado do número:
- **LOGZZ** → verde esmeralda (`bg-emerald-500`)
- **COINZZ** → roxo (`bg-purple-600`)

Baseado no campo `logistics_type` do pedido.

### 2. Menu "..." Funcional (DropdownMenu)

O botão `MoreHorizontal` ganha um `DropdownMenu` com 4 opções:
- 👁️ **Ver Detalhes** → abre modal
- ✏️ **Editar Pedido** → abre modal de edição
- ❌ **Cancelar Pedido** → muda status para "Frustrado" com confirmação (AlertDialog)
- 🗑️ **Apagar Pedido** → deleta permanentemente com confirmação (AlertDialog)

### 3. Tab "Informações" — Completa

**CLIENTE** (com 📋 botão copiar ao lado de cada dado):
- Nome, Telefone (link WhatsApp), Email, CPF/CNPJ — cada um com ícone de copiar sutil

**ENDEREÇO** (com botão copiar endereço completo):
- Rua, número, complemento, bairro, cidade/UF, CEP

**DATA DE AGENDAMENTO** (destaque visual):
- Borda dourada, texto grande (2xl), dia da semana por extenso
- Ex: `📅 sábado, 05 de abril de 2026`

**PRODUTOS DO PEDIDO** (NOVA seção — busca `offers` + `order_bumps` via `offer_id`):
- Produto principal: nome, qtd, preço
- Order Bumps: cada um com nome, label, hash, preço — borda emerald

**FINANCEIRO** (discriminado):
- Produto principal: R$ XX
- Order Bumps (N): R$ XX
- Frete: valor ou badge `🟢 FRETE GRÁTIS!`
- **Total** em destaque grande
- Pagamento:
  - Logzz → `💵 PAGAMENTO NA ENTREGA`
  - Coinzz → `💳 PAGAMENTO ONLINE — ENTREGA VIA CORREIOS`

### 4. Tab "Logística" — Links Externos

- Badge da plataforma (LOGZZ/COINZZ)
- **Logzz**: link clicável `https://app.logzz.com.br/meu-pedido/{logzz_order_id}` + copiar
- **Coinzz**: link clicável `https://app.coinzz.com.br/pedido/{coinzz_order_hash}` + copiar (NOVO)
- Rastreio, entregador, operador, etiquetas

### 5. Tab "Timeline" — Histórico Real

Busca `order_status_history` filtrado por `order_id`:
- Evento de criação (primeiro item fixo)
- Cada transição: `from_status → to_status` com badges coloridos
- Data/hora + fonte (Kanban manual, Logzz Webhook, Cancelamento manual, etc.)
- Se vazio: "Nenhuma movimentação registrada ainda"

### 6. Modal de Edição

Dialog com form para editar: nome, telefone, endereço completo, data de entrega.
Salva via `supabase.from("orders").update(...)`.

### 7. Copiar Dados (CopyBtn)

Componente inline com ícone `Copy` (lucide) sutil ao lado de cada dado.
Ao clicar: `navigator.clipboard.writeText()` + toast "Copiado!".
Aplicado em: nome, telefone, email, documento, endereço, número do pedido, rastreio, IDs externos.

---

### Queries adicionais (ao abrir modal)

1. `offers` via `offer_id` → nome e preço
2. `order_bumps` via `offer_id` + `is_active=true` → bumps vinculados
3. `order_status_history` via `order_id` → timeline completa

### Escopo
- **1 arquivo**: `src/pages/Pedidos.tsx` (reescrita completa)
- Sem migrações, sem edge functions novas
- Todas as tabelas e colunas já existem

