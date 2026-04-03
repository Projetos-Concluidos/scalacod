

## Plano: Corrigir Endpoint da API Coinzz para Listagem de Produtos

### Diagnostico

Os logs da Edge Function mostram claramente:
- `[coinzz-list-products] Status: 200` (HTTP 200 mas...)
- `[coinzz-list-products] Non-JSON: <!doctype html>... <title>Not Found | Coinzz</title>`

A Coinzz retorna uma pagina HTML de "Not Found" para o endpoint `/api/v1/products`. Enquanto isso, o endpoint de vendas usa `/api/sales` (sem `/v1/`). O padrao correto e **sem** o prefixo `/v1/`.

### Correcao

| Arquivo | Acao |
|---|---|
| `supabase/functions/coinzz-list-products/index.ts` | Trocar URL de `https://app.coinzz.com.br/api/v1/products` para `https://app.coinzz.com.br/api/products` |
| `supabase/functions/test-integration/index.ts` | Mesma correcao no teste de integracao Coinzz |

### Detalhe tecnico
Linha 55 do `coinzz-list-products/index.ts`:
```
// DE:
"https://app.coinzz.com.br/api/v1/products"
// PARA:
"https://app.coinzz.com.br/api/products"
```

Mesma mudanca na linha 174 do `test-integration/index.ts`.

Apos corrigir, redesplegar a edge function e testar o botao "Sincronizar Coinzz" novamente.

