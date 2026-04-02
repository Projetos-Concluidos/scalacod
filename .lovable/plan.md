

## Plano: Ajustar tamanho do badge de quantidade e melhorar imagem do produto

Problema: O badge de quantidade (`1x`) e o layout do resumo estão grandes demais. A imagem do produto pode aproveitar melhor o espaço.

### Alterações em `src/pages/CheckoutPublic.tsx`

**Badge de quantidade** (linha 818-820):
- Reduzir de `h-8 min-w-[2rem] text-lg` para `h-6 min-w-[1.5rem] px-1.5 rounded-md text-sm`

**Imagem do produto** (linhas 811, 813):
- Manter `h-20 w-20` (80px) — bom tamanho para visibilidade
- Ou se preferir algo mais equilibrado: `h-24 w-24` para dar mais destaque ao produto

**Preço** (linha 827):
- Reduzir de `text-lg` para `text-base`

**Resultado**: Badge compacto mas visível, imagem maior do produto, melhor proporção geral.

