

## Plano: Importacao de Ofertas Coinzz + Troca Automatica de Oferta por CEP

### Contexto
Atualmente o checkout hibrido ja detecta se o CEP tem cobertura Logzz (`provider = "logzz"`) ou nao (`provider = "coinzz"`). Porem, a oferta exibida ao cliente e sempre a mesma (oferta Logzz). O campo `coinzz_offer_hash` esta no Step 2 e e preenchido manualmente. Nao existe importacao de ofertas da Coinzz.

### O que sera feito

#### 1. Edge Function `coinzz-list-products`
Criar uma nova Edge Function identica em estrutura a `logzz-list-products`, que:
- Busca o token da integracao `coinzz` na tabela `integrations`
- Chama `GET https://app.coinzz.com.br/api/v1/products`
- Extrai ofertas no mesmo formato padrao (product_name, offer_hash, price, role, etc.)
- Retorna `{ success: true, offers: [...] }`

#### 2. Checkout Editor — Step 1: Importar Coinzz
Mover o bloco "Hash da Oferta Coinzz" do Step 2 para o Step 1, logo abaixo do bloco "Importar da Logzz". Transformar em um sistema de importacao completo:
- Botao "Sincronizar Coinzz" (estilo roxo, identico ao verde da Logzz)
- Combobox searchable com ofertas da Coinzz (badges roxos)
- Ao selecionar uma oferta Coinzz, preenche automaticamente `formCoinzzOfferHash` com o `offer_hash`
- Exibe o hash selecionado com badge COINZZ roxo

#### 3. Checkout Publico — Troca de Oferta por CEP
No `CheckoutPublic.tsx`, quando `provider === "coinzz"`:
- Buscar o `coinzz_offer_hash` do checkout
- Trocar visualmente a oferta exibida (nome, preco) para a oferta Coinzz
- O pedido criado ja usa `logistics_type: "coinzz"` (isso ja funciona)
- A oferta Coinzz e usada no envio automatico para a API Coinzz (ja funciona via `checkout-api`)

Para isso:
- Ao carregar o checkout, buscar tambem `coinzz_offer_hash` da tabela `checkouts`
- Buscar a oferta correspondente na tabela `offers` pelo hash
- Quando `provider` muda para `coinzz`, trocar o `offer` state para a oferta Coinzz
- Quando `provider` muda para `logzz`, voltar para a oferta original

#### 4. Estado no formulario
Novos estados:
- `coinzzOffers` — lista de ofertas importadas da Coinzz
- `syncingCoinzz` — loading state
- `coinzzPopoverOpen` — combobox open state
- `selectedCoinzzOffer` — oferta selecionada

### Fluxo do Checkout Hibrido

```text
Cliente digita CEP
       |
  checkout-api verifica cobertura Logzz
       |
  +----+----+
  |         |
Logzz     Coinzz
  |         |
Oferta    Oferta Coinzz
Logzz     (coinzz_offer_hash)
  |         |
COD       Pagamento Online
```

### Arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/coinzz-list-products/index.ts` | **Criar** — buscar ofertas da Coinzz |
| `src/pages/Checkouts.tsx` | Mover Coinzz para Step 1 + importacao com sync |
| `src/pages/CheckoutPublic.tsx` | Trocar oferta quando provider muda para coinzz |

### Seguranca
- Logzz permanece 100% intacta — nenhum codigo Logzz sera tocado
- A troca de oferta e apenas visual e no state, nao altera banco
- O `coinzz_offer_hash` continua sendo salvo normalmente no checkout

