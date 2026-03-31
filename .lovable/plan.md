

# Plano: Sincronizar Ofertas de Afiliado da Logzz

## Problema

O botão "Sincronizar Logzz" atualmente apenas lê ofertas já existentes no banco local. Ele não chama nenhuma API da Logzz para importar ofertas de afiliado. A Logzz não possui uma API REST pública documentada para listar ofertas de afiliado.

## Abordagem

A Logzz opera com uma API interna em `app.logzz.com.br/api/`. O endpoint de delivery-day já funciona com o bearer token. Vamos tentar múltiplos endpoints candidatos para buscar ofertas de afiliado e, caso nenhum funcione, retornar uma mensagem clara com instruções de fallback.

## Mudanças

### 1. Edge Function `checkout-api/index.ts` — Reescrever `sync_logzz_products`

Tentar os seguintes endpoints em sequência com o bearer token do usuário:
- `GET https://app.logzz.com.br/api/affiliate/offers`
- `GET https://app.logzz.com.br/api/v1/affiliate/offers`
- `GET https://app.logzz.com.br/api/offers`
- `GET https://app.logzz.com.br/api/v1/offers`
- `GET https://app.logzz.com.br/api/products`

Para cada endpoint:
- Usar `redirect: "manual"` e `Accept: application/json`
- Se retornar JSON válido com array de ofertas, parsear e importar
- Se retornar HTML ou redirect, pular para o próximo

Ao encontrar ofertas:
- Para cada oferta, criar/atualizar `products` e `offers` no banco usando `upsert` por hash/nome
- Retornar contagem de itens importados

Se nenhum endpoint funcionar:
- Retornar as ofertas locais existentes + mensagem explicativa dizendo que a API da Logzz não disponibiliza endpoint de listagem pública, sugerindo criar ofertas manualmente ou aguardar importação via webhook

### 2. Frontend `Checkouts.tsx` — Melhorar feedback da sincronização

- Mostrar os itens retornados (mesmo que sejam locais) no toast de sucesso
- Se a resposta contiver `message` de fallback, mostrar como toast informativo em vez de erro

### 3. Logging para debug

- A edge function vai logar o status e primeiros 200 chars de cada endpoint tentado, facilitando diagnóstico futuro

## Detalhes técnicos

```text
sync_logzz_products
├── Buscar token do usuário na tabela integrations
├── Tentar endpoints em sequência (5 candidatos)
│   ├── Se JSON válido com offers[] → parsear
│   │   ├── Upsert products (by hash ou name)
│   │   └── Upsert offers (by hash ou name)
│   └── Se HTML/redirect/erro → próximo endpoint
├── Se encontrou ofertas → retornar { success, synced, items }
└── Se nenhum endpoint → retornar ofertas locais + mensagem
```

Arquivos modificados:
- `supabase/functions/checkout-api/index.ts` — reescrever action `sync_logzz_products`
- `src/pages/Checkouts.tsx` — melhorar tratamento da resposta de sync

