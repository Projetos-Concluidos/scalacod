

## Plano: Status de Pagamento MercadoPago + Botao Coinzz no Card

### Problema

1. **Falta status de pagamento do MercadoPago** no detalhe do pedido — o webhook `mp-payment-webhook` salva `status_description` com o texto "MP: approved - accredited" mas nao existe coluna dedicada nem exibicao visual da jornada de pagamento
2. **Botao "Enviar para Coinzz"** existe ao lado do olho no card (linhas 497-509) mas o usuario relata que nao aparece — provavelmente porque a condicao `!order.coinzz_order_hash` ja e true (pedido ja tem hash) ou `logistics_type !== "coinzz"`
3. **Financeiro nao mostra status de pagamento** para pedidos online (PIX, cartao, boleto) — so mostra "PAGAMENTO ONLINE" generico

### Implementacao

#### 1. Migracao SQL — nova coluna `mp_payment_status`

Adicionar coluna para armazenar o status do pagamento MercadoPago separadamente:
- `mp_payment_status` (text) — ex: "approved", "pending", "rejected", "cancelled", "refunded"
- `mp_payment_status_detail` (text) — ex: "accredited", "pending_waiting_payment", "cc_rejected_other_reason"

#### 2. Atualizar `mp-payment-webhook` para salvar status detalhado

Alem de `status_description`, salvar:
- `mp_payment_status` = payment.status
- `mp_payment_status_detail` = payment.status_detail
- `total_installments` = payment.installments
- `gateway_fee` = payment.fee_details[0].amount (se existir)
- Inserir `order_status_history` com source "mp-payment-webhook"

#### 3. UI — Secao Financeiro aprimorada

No detalhe do pedido, mostrar:
- **Badge de status do pagamento** com cores: verde (approved), amarelo (pending/in_process), vermelho (rejected/cancelled), azul (refunded)
- **Status detail** traduzido: "accredited" → "Pagamento acreditado", "pending_waiting_payment" → "Aguardando pagamento", etc.
- Metodo (PIX/Cartao/Boleto) ja exibido
- Parcelas e taxa gateway ja exibidos (quando existem)

#### 4. Botao Coinzz no card — garantir visibilidade

O botao ja existe no codigo (linha 497), verificar a condicao. Adicionar tambem um botao para pedidos que JA tem hash (para reenvio/retry). Atualmente so aparece quando `!coinzz_order_hash` — ajustar para mostrar tambem quando o usuario precisa reenviar.

### Arquivos

| Arquivo | Acao |
|---|---|
| Migracao SQL | Adicionar `mp_payment_status`, `mp_payment_status_detail` em `orders` |
| `supabase/functions/mp-payment-webhook/index.ts` | Salvar status detalhado + history |
| `src/pages/Pedidos.tsx` | Badge de status pagamento no Financeiro + ajustar botao Coinzz |

### Seguranca
- Logzz intacta
- Coinzz intacta
- Apenas adiciona informacao visual e colunas opcionais

