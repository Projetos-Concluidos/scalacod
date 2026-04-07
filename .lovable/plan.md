

## Plano de Implementacao: Integracao Hyppe + Melhorias no Checkout Hibrido

### Relatorio de Analise

**Situacao Atual do Checkout:**
- O checkout hibrido funciona com 2 provedores: **Logzz** (COD com datas de entrega) e **Coinzz** (Correios/after pay)
- A decisao Logzz vs Coinzz e automatica via CEP (se Logzz cobre = COD, senao = Coinzz)
- Logzz tem sincronizacao completa de ofertas (import via API)
- Coinzz NAO tem sync de ofertas — o hash e inserido manualmente no checkout
- O checkout armazena `offer_id` (Logzz) e `coinzz_offer_hash` (Coinzz) separadamente

**Sobre a Hyppe:**
- A Hyppe e uma plataforma hibrida que suporta AMBOS: **COD** (pagamento na entrega) e **Antecipado** (pagamento online + Correios)
- A API da Hyppe tem sync de produtos (GET /api/produtos) com `produto_id` e ofertas
- Tem endpoints completos: verificar CEP, estoque COD, buscar fretes, criar pedido COD e antecipado
- Webhook com eventos de status (Agendado, Em Separacao, Roteirizado, etc.)

**Respostas as suas duvidas:**

1. **Coinzz no checkout**: Concordo que Coinzz sem sync de ofertas cria fricao. Sugiro manter Coinzz como opcao manual (para quem ja usa), mas priorizar Hyppe como alternativa hibrida nativa. Coinzz continuara funcionando 100% manual como esta.

2. **Checkout hibrido obrigatorio**: Sim, para um checkout HIBRIDO funcionar, o assinante PRECISA de pelo menos 1 oferta COD + 1 oferta online. Com Hyppe isso se simplifica: a mesma plataforma oferece ambos os modos. Para Logzz+Coinzz, cada um cobre um modo.

3. **Forcar selecao de oferta**: Sim, o checkout deve validar que o assinante tenha pelo menos 1 oferta vinculada. Vamos adicionar essa validacao.

4. **Funciona na pratica?**: Sim. Cada checkout tera um campo `logistics_type` implicito baseado nas ofertas importadas. Se importou so Logzz = so Logzz. Se importou so Hyppe = so Hyppe. Se importou ambos = hibrido.

---

### Implementacao em 6 Blocos

#### BLOCO 1 — Configuracoes: Aba Hyppe
- Criar `src/components/settings/HyppeTab.tsx` (mesmo padrao da CoinzzTab)
- Token API, switch ativo/inativo, webhook URL, testar conexao
- Adicionar na aba Integracoes em `Configuracoes.tsx` abaixo da Coinzz
- Adicionar `hyppe_tenant` no `test-integration` Edge Function (GET /api/produtos para validar token)

#### BLOCO 2 — Sync de Ofertas Hyppe
- Criar Edge Function `hyppe-list-products/index.ts`
  - GET /api/produtos com token do assinante
  - Retorna lista de produtos com ofertas, igual ao logzz-list-products
- Adicionar botao "Sincronizar Hyppe" no wizard do checkout (Passo 1)
  - Combobox identico ao da Logzz com badge "HYPPE" em laranja
  - Upsert produto + oferta no banco com `source: "hyppe"` e `hyppe_produto_id`

#### BLOCO 3 — Checkout Publico: Provider Hyppe
- No `checkout-api` action `check_delivery`:
  - Quando CEP informado, verificar PRIMEIRO Logzz, depois Hyppe (POST /api/checkout/verificar-cep + /api/checkout/estoque/cod), fallback Coinzz
  - Se Hyppe COD tem estoque → provider = "hyppe_cod", buscar datas de agendamento
  - Se nao tem estoque COD mas Hyppe antecipado ativo → provider = "hyppe_antecipado", buscar fretes
- No `CheckoutPublic.tsx`:
  - Provider agora pode ser: "logzz" | "coinzz" | "hyppe_cod" | "hyppe_antecipado"
  - Hyppe COD: mesmo fluxo do Logzz (selecionar data)
  - Hyppe Antecipado: exibir opcoes de frete (PAC, SEDEX) com preco e prazo

#### BLOCO 4 — Criar Pedido Hyppe
- Criar Edge Function `hyppe-create-order/index.ts`
  - COD: POST /api/checkout/pedidos/cod (com cidade_id, bairro_id via endpoints auxiliares)
  - Antecipado: POST /api/checkout/pedidos/antecipado (com freteSelecionado)
  - Salvar `hyppe_order_id` no pedido
- No `checkout-api` action `create_order`:
  - Novo branch para `logistics_type === "hyppe_cod"` e `"hyppe_antecipado"`
  - Delegar para hyppe-create-order

#### BLOCO 5 — Webhook Hyppe
- Criar Edge Function `hyppe-webhook/index.ts`
  - Receber eventos de status (print do usuario mostra: Status Alterado, Agendado, Em Separacao, etc.)
  - Mapear status Hyppe → Kanban ScalaCOD
  - Atualizar pedido + timeline + disparar trigger-flow
- Exibir URL do webhook na HyppeTab

#### BLOCO 6 — Checkout: Campo hyppe_offer + Validacao
- Adicionar coluna `hyppe_offer_data` (jsonb) na tabela `checkouts` para guardar produto_id e oferta_id da Hyppe
- No wizard Passo 1: secao Hyppe com Combobox (igual Logzz)
- Validacao: checkout hibrido requer pelo menos 1 oferta de qualquer provedor
- No `CheckoutPublic.tsx`: carregar oferta Hyppe e decidir provider dinamicamente

---

### DB Migration

```sql
ALTER TABLE public.checkouts 
ADD COLUMN IF NOT EXISTS hyppe_offer_data jsonb DEFAULT NULL;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS hyppe_order_id text DEFAULT NULL;
```

### Arquivos Criados/Modificados

| Arquivo | Acao |
|---|---|
| `src/components/settings/HyppeTab.tsx` | Criar |
| `src/pages/Configuracoes.tsx` | Adicionar HyppeTab |
| `supabase/functions/hyppe-list-products/index.ts` | Criar |
| `supabase/functions/hyppe-create-order/index.ts` | Criar |
| `supabase/functions/hyppe-webhook/index.ts` | Criar |
| `supabase/functions/test-integration/index.ts` | Adicionar hyppe_tenant |
| `supabase/functions/checkout-api/index.ts` | Adicionar provider hyppe |
| `src/pages/Checkouts.tsx` | Adicionar sync Hyppe no wizard |
| `src/pages/CheckoutPublic.tsx` | Adicionar provider hyppe_cod/antecipado |
| `src/pages/Pedidos.tsx` | Link Hyppe no detalhe do pedido |
| Migration SQL | 2 colunas novas |

### Impacto no Codigo Existente

- **Logzz**: ZERO impacto. Fluxo Logzz permanece identico.
- **Coinzz**: ZERO impacto. Fluxo Coinzz permanece identico.
- **Checkout hibrido**: Adicionado como TERCEIRO provider, sem alterar logica dos 2 existentes.
- **Kanban**: Funciona automaticamente (status mapping no webhook).

### Estimativa
3-4 mensagens para implementar todos os 6 blocos.

