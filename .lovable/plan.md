

## Plano: Garantir slug unico com hash da oferta

### Problema
Dois checkouts podem ter a mesma URL (`/c/1-uni-organic-lizz`) porque o slug e gerado apenas a partir do nome, sem incluir o hash da oferta.

### Correcao

**Arquivo: `src/pages/Checkouts.tsx`**

1. Na funcao `handleSave()` (linha 286): alterar a geracao do slug para incluir o `offer_hash` da oferta Logzz selecionada (ou os primeiros 7 chars do `formOfferId` como fallback). Formato: `{nome}-{hash}`.

2. Na selecao de oferta Logzz (linha 489): ja gera slug com `offer_hash` — manter esse comportamento.

3. Para checkouts existentes sem hash no slug: nao alterar retroativamente (so novos/editados).

### Detalhe tecnico

Linha 286, trocar:
```typescript
const slug = formName.trim().toLowerCase()...
```
Para:
```typescript
const offerSuffix = selectedLogzzOffer?.offer_hash 
  || formOfferId?.slice(0, 7) 
  || Math.random().toString(36).slice(2, 9);
const rawSlug = `${formName.trim()}-${offerSuffix}`;
const slug = rawSlug.toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9-]/g, "")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 80);
```

Isso garante que cada checkout tera um slug unico baseado no nome + hash da oferta, eliminando URLs duplicadas.

