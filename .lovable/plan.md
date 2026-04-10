

# Plano: Melhorias na Página de Leads

## Resumo
Adicionar seleção múltipla com checkbox, edição/exclusão de leads, e botão para inserir leads em campanhas de remarketing.

## 1. Seleção Múltipla com Checkbox

- Adicionar estado `selectedIds: Set<string>` e checkbox "selecionar todos" no header da tabela
- Cada linha da tabela e card do grid recebem um checkbox individual
- Barra de ações flutuante aparece quando há leads selecionados, com contagem e botões: **Excluir selecionados** e **Adicionar ao Remarketing**

## 2. Edição de Lead

- No modal de detalhes do lead, adicionar botão **Editar** que alterna os campos para modo editável (nome, telefone, email, documento, status)
- Salvar via `supabase.from("leads").update(...)` com os dados editados
- Os dados de endereço vêm dos pedidos (tabela `orders`), não da tabela leads — serão exibidos read-only no detalhe do lead a partir do último pedido

## 3. Exclusão de Lead

- Botão **Excluir** no modal de detalhes (individual)
- Confirmação via dialog antes de excluir
- Exclusão em massa via barra de ações (com confirmação)
- Usa `supabase.from("leads").delete().in("id", [...])`

## 4. Dados Completos no Modal de Detalhe

- Exibir dados de endereço do cliente buscando do último pedido associado (tabela `orders`): endereço, cidade, estado, CEP, complemento
- Manter Histórico de Pedidos como já existe

## 5. Botão "Adicionar ao Remarketing"

- No modal de detalhe e na barra de ações em massa: botão que abre um mini-modal listando as campanhas de remarketing ativas do usuário
- O usuário seleciona a campanha e confirma
- **Migração necessária**: adicionar coluna opcional `lead_id` (uuid, nullable) na tabela `remarketing_enrollments` para permitir enrollment por lead (sem order)
- Inserir registro em `remarketing_enrollments` com `campaign_id`, `user_id`, `lead_id` e status `active`

## Alterações Técnicas

### Migração SQL
```sql
ALTER TABLE public.remarketing_enrollments 
ADD COLUMN IF NOT EXISTS lead_id uuid;
```

### Arquivos modificados
- `src/pages/Leads.tsx` — toda a lógica de seleção, edição, exclusão e remarketing

### Dependências
- Nenhuma nova dependência necessária

