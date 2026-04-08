

## Relatório: Atribuição de Afiliado na Logzz

### O Problema

Quando o pedido #HN3SG6S8 foi enviado para a Logzz via webhook de importação, o campo `affiliate_email` estava **vazio** e **não foi enviado nenhum identificador de afiliado**. Por isso, a Logzz registrou o pedido como sendo do **produtor**, sem gerar comissão para o afiliado.

A URL do afiliado revela o padrão:

```text
https://entrega.logzz.com.br/pay/memdn8lr0/1-organic-lizz-97-1
                                 ^^^^^^^^^^
                                 ID do afiliado na Logzz
```

Enquanto a URL do produtor seria:
```text
https://entrega.logzz.com.br/pay/1-organic-lizz-97-1
                                 (sem ID de afiliado)
```

### Análise do Fluxo Atual

| Etapa | O que acontece | Problema |
|---|---|---|
| 1. Sincronização de ofertas (`logzz-list-products`) | Busca produtos da Logzz API. Para afiliados, a resposta vem dentro de `data.affiliate[].offers[]` com `scheduling_checkout_url` contendo o ID do afiliado | A `scheduling_checkout_url` salva no banco **não contém** o segmento do afiliado — todas as URLs salvas são do padrão produtor |
| 2. Checkout público (`checkout-api`) | O cliente faz o pedido. Não coleta nenhum `affiliate_id` | **Não tem campo** para armazenar o ID do afiliado da Logzz |
| 3. Envio para Logzz (`logzz-create-order`) | Envia payload com `offer` (hash) e `affiliate_email` (vazio) | **Faltam dois campos**: o `affiliate_email` nunca é preenchido e não existe campo para o ID/código do afiliado |
| 4. Logzz processa | Recebe o pedido mas sem identificação de afiliado | **Comissão não é gerada** |

### Dados no Banco (Pedido #HN3SG6S8)

- `affiliate_email`: **NULL**
- `affiliate_name`: **NULL**
- `offer_id`: `2d9c3e8e-...` → offer hash: `sal6oxlk`
- `scheduling_checkout_url` da oferta: `https://entrega.logzz.com.br/pay/1-uni-organic-lizz-107` (sem ID afiliado)

### Solução Proposta

#### 1. Novo campo na tabela `offers`: `affiliate_code`
Armazena o identificador do afiliado extraído da `scheduling_checkout_url` durante a sincronização.

**Lógica de extração**: Se a URL tiver o padrão `/pay/{affiliate_code}/{product-slug}` (dois segmentos após `/pay/`), o primeiro segmento é o `affiliate_code`. Se tiver apenas um segmento (`/pay/{product-slug}`), é uma oferta de produtor e o campo fica vazio.

#### 2. Atualizar `logzz-list-products` e sync no `checkout-api`
Ao importar ofertas da Logzz, se o `role === "affiliate"`, extrair o `affiliate_code` da `scheduling_checkout_url` e salvar no campo novo.

#### 3. Atualizar `logzz-create-order`
Ao montar o payload para a Logzz, buscar o `affiliate_code` da oferta e incluir no payload:
```json
{
  "offer": "sal6oxlk",
  "affiliate_code": "memdn8lr0"
}
```

#### 4. Atualizar tabela `orders` com `affiliate_code`
Salvar também no pedido para rastreabilidade.

### Arquivos Impactados

| Arquivo | Mudança |
|---|---|
| **Migration SQL** | Adicionar coluna `affiliate_code` em `offers` e `orders` |
| `supabase/functions/logzz-list-products/index.ts` | Extrair `affiliate_code` da URL ao importar |
| `supabase/functions/checkout-api/index.ts` | Salvar `affiliate_code` no sync e no upsert de ofertas |
| `supabase/functions/logzz-create-order/index.ts` | Buscar `affiliate_code` da oferta e incluir no payload para Logzz |

### Como vai funcionar depois

```text
1. Sync Logzz → API retorna affiliate.offers[].scheduling_checkout_url
   "https://entrega.logzz.com.br/pay/memdn8lr0/1-organic-lizz-97-1"
   → Extrai: affiliate_code = "memdn8lr0"
   → Salva na tabela offers

2. Cliente compra → Pedido criado com offer_id vinculado

3. logzz-create-order → Busca offer → Encontra affiliate_code = "memdn8lr0"
   → Payload: { offer: "sal6oxlk", affiliate_code: "memdn8lr0" }
   → Logzz reconhece o afiliado → Comissão gerada!
```

### Impacto
- Correção definitiva para atribuição de comissões de afiliado
- Zero impacto em pedidos de produtor (campo fica vazio)
- Retrocompatível com ofertas existentes (basta re-sincronizar)

