

## Plano: Notificacao Push para Pagamento Aprovado no Coinzz

### Problema
O webhook da Coinzz (`coinzz-webhook`) atualiza o status do pedido e dispara fluxos de automacao, mas nao cria uma notificacao push quando o pagamento e aprovado. O webhook do MercadoPago (`mp-invoice-webhook`) ja faz isso.

### Correcao

**Arquivo: `supabase/functions/coinzz-webhook/index.ts`**

Adicionar insercao de notificacao quando o status muda para `"Confirmado"` (pagamento aprovado):

```typescript
// Apos o insert no order_status_history (linha ~231)
if (newKanbanStatus === "Confirmado") {
  const valorFormatado = orderFinalPrice
    ? `R$ ${orderFinalPrice.toFixed(2).replace(".", ",")}`
    : "";

  await supabase.from("notifications").insert({
    user_id: order.user_id,
    title: "Pagamento aprovado! 💰",
    body: `Pedido #${orderNumber}${valorFormatado ? ` — ${valorFormatado}` : ""} foi confirmado via Coinzz.`,
    type: "new_order",
    metadata: { order_id: order.id, source: "coinzz" },
  });
}
```

Usar `type: "new_order"` para que o sistema de push existente (`useNotificationPush`) toque o som de notificacao e exiba o alerta no navegador.

### Arquivos envolvidos
| Arquivo | Mudanca |
|---|---|
| `supabase/functions/coinzz-webhook/index.ts` | Inserir notificacao push ao aprovar pagamento |

### Resultado
- Notificacao push com som aparece no sino e no navegador quando um pagamento Coinzz e aprovado
- Compativel com as preferencias do usuario (`push_new_order`)
- Sem alteracao no frontend (ja funciona via realtime + `NotificationBell`)

