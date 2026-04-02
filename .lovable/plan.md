
## Plano: Exibir status do pagamento no detalhe do pedido agora

### Diagnóstico
Pelo código e pelos dados atuais, o problema não é só visual:

1. O detalhe do pedido em `src/pages/Pedidos.tsx` só mostra o bloco de status se `o.mp_payment_status` existir.
2. Há pedidos antigos/legados em que o webhook já gravou `status_description` como `MP: cancelled - expired`, mas `mp_payment_status` e `mp_payment_status_detail` estão `null`.
3. O modal usa `selectedOrder` como snapshot do card. Se o pedido atualizar depois, o detalhe pode continuar com dados antigos.

Resultado: o print mostra apenas “Método: PIX”, porque a UI depende de colunas que podem estar vazias, mesmo quando já existe informação suficiente no pedido.

### O que vou ajustar
#### 1. Corrigir a fonte de dados do modal
Em vez de renderizar o detalhe só com o objeto congelado em `selectedOrder`, vou fazer o modal usar a versão mais recente do pedido da lista `orders` pelo `id`.

Assim, se o webhook atualizar o pedido, o detalhe refletirá automaticamente.

#### 2. Adicionar fallback seguro para status MercadoPago
No bloco:
`💳 PAGAMENTO ONLINE — ENTREGA VIA CORREIOS`

vou exibir o status usando esta prioridade:
1. `mp_payment_status`
2. `status_description` quando vier no formato `MP: status - detail`
3. se não houver detalhe, mostrar ao menos um badge de “Status não informado”

Exemplo do fallback:
```text
status_description = "MP: cancelled - expired"
-> status = cancelled
-> detalhe = expired
```

#### 3. Garantir tradução e cores dos badges
Vou manter exatamente o padrão pedido:

- Verde = Aprovado
- Amarelo = Pendente
- Vermelho = Rejeitado/Cancelado
- Azul = Reembolsado

E traduzir os detalhes, por exemplo:
- `accredited` → Pagamento aprovado
- `pending_waiting_payment` → Aguardando pagamento
- `cc_rejected_insufficient_amount` → Saldo insuficiente
- `expired` → Pagamento expirado

#### 4. Exibir a jornada abaixo de “Método”
No detalhe ficará assim, abaixo do cabeçalho financeiro:

```text
💳 PAGAMENTO ONLINE — ENTREGA VIA CORREIOS
Método: PIX
Status: Pagamento Cancelado
Detalhe: Pagamento expirado
```

Ou, quando aprovado:
```text
Método: PIX
Status: Pagamento Aprovado
Detalhe: Pagamento aprovado
```

#### 5. Manter tudo isolado
Não vou mexer na lógica da Logzz.
Não vou alterar fluxo crítico de criação de pedido.
O ajuste é focado em:
- leitura do dado no modal
- fallback visual para pedidos que já existem

### Arquivos que serão ajustados
| Arquivo | Ação |
|---|---|
| `src/pages/Pedidos.tsx` | Corrigir detalhe do pedido para usar dados atualizados + fallback de status MercadoPago |

### Observação importante
Como já existe pedido com `status_description` preenchido e colunas `mp_*` vazias, este ajuste é o caminho mais seguro para fazer o status aparecer imediatamente sem depender de novo pagamento ou novo webhook.

### Resultado esperado
Ao abrir o detalhamento do pedido, abaixo de:

`💳 PAGAMENTO ONLINE — ENTREGA VIA CORREIOS`

vão aparecer:
- método traduzido
- badge colorido do status
- detalhe traduzido do pagamento

mesmo nos pedidos em que o webhook antigo salvou só `status_description`.
