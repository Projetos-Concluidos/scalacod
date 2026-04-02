

## Plano: Fix Plano "FREE" + Melhorar Sistema de Tokens Admin

### Problema 1: Plano mostra "FREE" mesmo com PRO ativo

**Causa raiz**: A tabela exibe `profiles.plan` (campo texto, default "free") em vez de buscar o nome real da tabela `plans` via `plan_id`. A function `admin_update_user_plan` atualiza `plan_id` mas não atualiza o campo `plan` texto.

**Fix (2 partes)**:

1. **`admin_update_user_plan` (migração)** — Atualizar a function para também setar `profiles.plan` com o slug do plano selecionado
2. **`AdminAssinantes.tsx`** — Buscar planos e fazer join client-side para mostrar o nome real do plano vinculado ao `plan_id`, não o campo `plan` texto

### Problema 2: Sistema de tokens limitado

**Melhorias no modal de tokens**:

1. **Adicionar e Remover** — Toggle entre "Creditar" e "Debitar" tokens
2. **Tipo de operação** — Dropdown: Bônus, Correção, Estorno, Compra manual
3. **Histórico completo** — Ao abrir o modal, mostrar lista de todas as operações feitas para aquele tenant (via `admin_action_logs` filtrado por `action = 'add_tokens'` e novo `'remove_tokens'`)

### Alterações

#### 1. Migração SQL — Fix `admin_update_user_plan` + nova function `admin_remove_tokens`

```sql
-- Atualizar admin_update_user_plan para setar profiles.plan com o slug
CREATE OR REPLACE FUNCTION public.admin_update_user_plan(...)
  -- Adiciona: busca slug do plano e seta em profiles.plan

-- Nova function admin_remove_tokens
CREATE OR REPLACE FUNCTION public.admin_remove_tokens(p_user_id, p_amount, p_reason)
  -- Subtrai tokens do balance (com check >= 0)
  -- Registra em admin_action_logs com action='remove_tokens'
```

#### 2. `src/pages/admin/AdminAssinantes.tsx`

- **Coluna Plano**: Criar mapa `planId→planName` a partir de `plans[]` já carregado. Exibir `planMap[t.plan_id] || t.plan || "free"` em vez de `t.plan || "free"`
- **Modal de Tokens redesenhado**:
  - Tabs: "Creditar" | "Debitar"
  - Campo quantidade + motivo (já existem)
  - Dropdown tipo: Bônus / Correção / Estorno / Compra manual
  - Seção "Histórico" abaixo: lista operações do `admin_action_logs` filtradas por `target_user_id` e actions `add_tokens`/`remove_tokens`, mostrando data, quantidade, motivo, tipo (crédito/débito)
  - Saldo atual visível no topo do modal

### Escopo
- 1 migração (fix function + nova function)
- 1 arquivo editado: `AdminAssinantes.tsx`

