

## Plano: Gerenciamento Dinâmico de Packs de Tokens + Badges Promocionais

### Problema Atual

Os packs de tokens estão **hardcoded** em 3 lugares:
- `src/pages/Vozes.tsx` (frontend, array `packs`)
- `supabase/functions/purchase-tokens/index.ts` (edge function, `TOKEN_PACKS`)

Isso impede alterar preços, criar promoções ou adicionar/remover packs sem deploy. Também não existe análise de custo por token para o assinante.

### Análise de Custo por Token (atual)

| Pack | Tokens | Preço | Custo/Token |
|------|--------|-------|-------------|
| Iniciante | 5.000 | R$ 19,90 | R$ 0,00398 |
| Essencial | 10.000 | R$ 39,90 | R$ 0,00399 |
| Profissional | 50.000 | R$ 197,00 | R$ 0,00394 |
| Enterprise | 100.000 | R$ 397,00 | R$ 0,00397 |

Os preços são quase lineares — sem benefício real por volume. O gerenciamento dinâmico permitirá ajustar isso.

---

### Entrega 1: Tabela `token_packs` no banco

Nova tabela para armazenar os packs dinamicamente:

```sql
CREATE TABLE public.token_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tokens integer NOT NULL,
  price numeric NOT NULL,
  is_active boolean DEFAULT true,
  is_popular boolean DEFAULT false,
  badge_type text DEFAULT null, -- 'blackfriday', 'promo', 'oferta', 'semana_assinante', null
  badge_label text DEFAULT null, -- texto custom do badge ex: "🔥 Black Friday -40%"
  sort_order integer DEFAULT 0,
  original_price numeric DEFAULT null, -- preço original (riscado) para promoções
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

RLS: leitura pública, escrita superadmin.

Migração inclui seed dos 4 packs atuais.

---

### Entrega 2: Painel Admin — Aba "Packs" no AdminTokens

Nova aba **"📦 Packs"** na página `/admin/tokens`:

- **Tabela de packs**: nome, tokens, preço, custo/token (calculado), badge, status ativo/inativo
- **Botão "Novo Pack"** + modal de criação/edição com:
  - Nome, slug, tokens, preço atual, preço original (para mostrar "de/por")
  - Toggle ativo, toggle popular
  - Seletor de badge promocional com preview visual:
    - 🖤 **Black Friday** (fundo preto, texto dourado)
    - 🔥 **Promoção** (fundo vermelho, texto branco)
    - 💰 **Em Oferta** (fundo verde, texto branco)
    - 🎉 **Semana do Assinante** (fundo roxo, texto branco)
    - Sem badge
  - Campo "Label do badge" para texto personalizado
- **Coluna "Custo/Token"**: calculada automaticamente (preço / tokens) para facilitar análise

---

### Entrega 3: Frontend Vozes.tsx — Packs dinâmicos

- Remove o array `packs` hardcoded
- Busca `token_packs` do banco (apenas `is_active = true`, ordenado por `sort_order`)
- Renderiza badges promocionais nos cards:
  - `original_price` aparece riscado quando presente
  - Badge colorido no canto do card conforme `badge_type`
- O `popular` continua destacando o card com borda especial

---

### Entrega 4: Edge Function `purchase-tokens` — Validação dinâmica

- Remove `TOKEN_PACKS` hardcoded
- Busca o pack por `slug` na tabela `token_packs` (via service role)
- Valida `is_active = true` antes de processar
- Usa `price` e `tokens` do banco para criar o pagamento

---

### Escopo
- **1 migração**: tabela `token_packs` + seed + RLS
- **1 edge function editada**: `purchase-tokens`
- **2 arquivos frontend editados**: `AdminTokens.tsx` (nova aba), `Vozes.tsx` (packs dinâmicos)

