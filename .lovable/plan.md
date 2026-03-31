

# Plano: Corrigir Importação de Ofertas da Logzz

## Problema

Os logs mostram que `GET /api/v1/products` retorna status 200 com JSON do tipo `object` (não array), mas o código atual não extrai os dados porque espera arrays diretos. A Logzz retorna produtos agrupados por papel: `{ producer: [...], affiliate: [...], coproducer: [...] }`, cada produto contendo um array de `offers`.

## Mudanças

### 1. Edge Function `checkout-api/index.ts` — Corrigir parsing do `/api/v1/products`

- Remover os 7 endpoints candidatos. Usar apenas `GET https://app.logzz.com.br/api/v1/products`
- Adicionar parsing para a estrutura agrupada por papel:
  ```
  { producer: [{ name, hash, offers: [{ name, hash, price }] }],
    affiliate: [...],
    coproducer: [...] }
  ```
- Para cada produto em cada categoria, extrair cada offer com: `product_name`, `product_hash`, `offer_hash`, `offer_name`, `price`, `role`
- Logar a resposta completa (primeiros 500 chars) para debug
- Manter o upsert existente de products/offers no banco

### 2. Frontend `Checkouts.tsx` — Melhorar seleção de oferta

- Quando o usuário seleciona uma oferta no dropdown, preencher automaticamente:
  - `formName` → nome do produto
  - Slug gerado: `nome-do-produto-offerhash`
- Mostrar no dropdown: `Nome do Produto — Nome da Oferta (R$ preço)`
- Incluir o nome do produto no texto de cada SelectItem (já busca products junto com offers)

### 3. Criar Edge Function dedicada `logzz-list-products`

Alternativa mais limpa: criar uma edge function separada `logzz-list-products` que:
- Autentica o usuário via JWT
- Busca o token Logzz da tabela `integrations`
- Chama `GET https://app.logzz.com.br/api/v1/products` com Bearer token
- Extrai ofertas das 3 categorias (producer, affiliate, coproducer)
- Retorna `{ success: true, offers: [...] }` diretamente, sem salvar no banco (o frontend decide)

O `SyncOffersButton` passará a chamar esta função via `supabase.functions.invoke("logzz-list-products")`, preenchendo o dropdown com as ofertas retornadas sem precisar salvar no banco primeiro.

## Detalhes técnicos

```text
/api/v1/products response shape:
{
  producer: [
    { name: "Whey", hash: "abc123", offers: [
      { name: "Kit 1", hash: "xyz789", price: 197.00 }
    ]}
  ],
  affiliate: [...],
  coproducer: [...]
}

Extração:
for role in [producer, affiliate, coproducer]:
  for product in response[role]:
    for offer in product.offers:
      → { product_name, product_hash, offer_hash, offer_name, price, role }
```

Arquivos:
- `supabase/functions/logzz-list-products/index.ts` — nova edge function dedicada
- `supabase/functions/checkout-api/index.ts` — simplificar `sync_logzz_products` (usar mesmo parsing corrigido)
- `src/pages/Checkouts.tsx` — usar nova função, preencher campos ao selecionar oferta

