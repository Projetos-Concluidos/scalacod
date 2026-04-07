

## Plano: Chave de Prioridade de Provider no Checkout

### Faz sentido?

Sim, faz total sentido. Hoje a lógica no `checkout-api` verifica **sempre Logzz primeiro, depois Hyppe, depois Coinzz**. Se o assinante trabalha primariamente com Hyppe, ele quer que a Hyppe tenha prioridade — ou seja, se ambas cobrem o CEP, quem "ganha" é a Hyppe.

A chave ficaria na criação/edição do checkout como um select simples.

---

### Implementação

**1. Nova coluna no banco**
```sql
ALTER TABLE public.checkouts 
ADD COLUMN IF NOT EXISTS provider_priority text DEFAULT 'logzz_first';
```
Valores: `logzz_first` | `hyppe_first`

**2. Checkout Wizard (Checkouts.tsx)**
- Adicionar um `Select` no Passo 1 do wizard, abaixo das ofertas:
  - Label: "Prioridade de verificação de CEP"
  - Opções: "Logzz primeiro (padrão)" / "Hyppe primeiro"
- Salvar no campo `provider_priority`

**3. Checkout API (checkout-api/index.ts)**
- Na action `check_delivery`, ler `provider_priority` do checkout
- Se `hyppe_first`: verificar Hyppe COD → Hyppe Antecipado → Logzz → Coinzz
- Se `logzz_first` (padrão): manter ordem atual (Logzz → Hyppe → Coinzz)

**4. Types update**
- O campo será adicionado automaticamente ao regenerar types

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| Migration SQL | 1 coluna nova |
| `src/pages/Checkouts.tsx` | Select de prioridade no wizard |
| `supabase/functions/checkout-api/index.ts` | Lógica condicional de ordem |

### Impacto
- Zero impacto em checkouts existentes (default = `logzz_first`, comportamento atual)
- Coinzz continua sempre como fallback final

