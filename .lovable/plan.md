

# Corrigir Link de Afiliado Logzz nos Pedidos

## Problema
O `scheduling_checkout_url` importado da API Logzz vem sem o código do afiliado:
- **Atual (errado):** `https://entrega.logzz.com.br/pay/1-uni-organic-lizz-107`
- **Correto:** `https://entrega.logzz.com.br/pay/{AFFILIATE_CODE}/1-uni-organic-lizz-107`

O link sem o código do afiliado direciona a comissão para o produtor, não para o afiliado.

## Plano

### 1. Edge Function `logzz-list-products/index.ts`
Quando `role === "affiliate"` e o `affiliate_code` foi identificado, reconstruir o `scheduling_checkout_url` injetando o código do afiliado na URL:
- Detectar o padrão `/pay/SLUG` (sem afiliado) vs `/pay/AFF/SLUG` (com afiliado)
- Se o URL não contém o afiliado, inserir o `affiliateCode` no caminho: `/pay/{affiliateCode}/{slug}`
- Salvar a URL corrigida no campo `scheduling_checkout_url` retornado

### 2. Exibição em `Pedidos.tsx`
Adicionar lógica de fallback na renderização do link:
- Se `detailOffer.affiliate_code` existe e o `scheduling_checkout_url` não contém o código, reconstruir a URL dinamicamente antes de exibir
- Isso garante que mesmo ofertas já sincronizadas (com URL antiga) mostrem o link correto

### Arquivos modificados
- `supabase/functions/logzz-list-products/index.ts` — reconstruir URL com affiliate_code
- `src/pages/Pedidos.tsx` — fallback dinâmico na exibição do link

