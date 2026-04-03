
## Plano: Corrigir uso do hash Coinzz — diferenciar product_hash de offer_hash

### Diagnostico

Voce esta correto. O `68212ba3bc599` que aparece nas 3 URLs e o **hash do PRODUTO**, nao da oferta. Na Coinzz:

- **Product hash** (`68212ba3bc599`) = identifica o produto inteiro (compartilhado por todas as ofertas/kits)
- **Offer hash** (`offxxxxxxxx`) = identifica a oferta especifica (1 uni, 3 uni, 4 uni — cada um tem hash unico)

A API `POST /api/sales` exige o `offer_hash` (da oferta), nao o `product_hash`. Atualmente o sistema esta usando o product hash para todas as ofertas, o que faz a Coinzz criar sempre o mesmo pedido independente do kit selecionado.

### Problema na URL do Coinzz

```text
/checkout/1-organiclizz-por-107-0/68212ba3bc599   ← product hash (igual)
/checkout/3-por-167-hxrdd-0/68212ba3bc599          ← product hash (igual)
/checkout/4-por-197-lvyfb-0/68212ba3bc599           ← product hash (igual)
```

O offer_hash real de cada kit nao esta visivel na URL. Ele precisa ser obtido no painel da Coinzz: **Produto → Ofertas → cada oferta tem seu proprio hash** (geralmente comeca com `off...`).

### Correcoes

#### 1. `src/pages/Checkouts.tsx` — Melhorar campo e orientacao
- Atualizar placeholder de `"Ex: 68212ba3bc599"` para `"Ex: off1a2b3c4d5e"`
- Adicionar texto explicativo: "Use o hash da OFERTA (nao do produto). Cada kit/quantidade tem seu proprio hash. Encontre em: Coinzz → Produto → Ofertas."
- Adicionar alerta visual se o hash nao comecar com `off` (aviso, nao bloqueio — formato pode variar)

#### 2. `src/pages/CheckoutPublic.tsx` — Log de debug
- Adicionar log quando trocar para oferta Coinzz mostrando qual hash esta sendo usado, para facilitar debug

#### 3. `supabase/functions/checkout-api/index.ts` — Log do offer_hash usado
- Adicionar log claro do `offer_hash` sendo enviado para a API Coinzz para facilitar rastreamento

### Como encontrar o offer_hash correto
O usuario precisa acessar o painel da Coinzz:
1. Ir em **Produtos** → selecionar o produto
2. Ir na aba **Ofertas**
3. Cada oferta (1 uni, 3 uni, 4 uni) tera seu **hash proprio**
4. Copiar o hash da oferta especifica e colar no campo do checkout correspondente

### Resultado
- Cada checkout tera seu proprio `offer_hash` unico da oferta correta
- Campo com orientacao clara para evitar confusao entre product hash e offer hash
- Pedidos Coinzz serao criados com a oferta/kit correto
