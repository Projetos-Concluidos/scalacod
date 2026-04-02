

## Relatório: Por que a notificação WhatsApp não disparou ao mudar para "Agendado"

---

### Causa Raiz Identificada

O pedido `d55d37e0` foi enviado para a Logzz com sucesso (status 200). A função `logzz-create-order` então:
1. Atualizou o status do pedido para "Agendado" (linha 312)
2. Registrou no histórico (linha 319)
3. **Não chamou `trigger-flow`** — fim da execução

O fluxo "📅 Data de Entrega Agendada" existe, está ativo, e escuta `order_status_changed` com `trigger_status: Agendado`. Porém, ninguém o invoca.

### Onde o `trigger-flow` é chamado hoje

| Local | Quando |
|-------|--------|
| `Pedidos.tsx` (linha 139) | Drag-and-drop no Kanban |
| `checkout-api` create_order (linha 294) | Pedido criado (order_created) |
| `checkout-api` process_logzz_webhook (linha 1062) | Webhook reverso da Logzz |

**Faltando**: `logzz-create-order` — quando a Logzz aceita o pedido e o status muda para "Agendado".

---

### Plano de Correção

#### `supabase/functions/logzz-create-order/index.ts`

Após o update do status para "Agendado" (linha 316) e o insert no histórico (linha 329), adicionar chamada ao `trigger-flow`:

```typescript
// Trigger flow notifications for status change to Agendado
try {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  await fetch(`${supabaseUrl}/functions/v1/trigger-flow`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: order.user_id,
      orderId: order_id,
      newStatus: "Agendado",
      triggerEvent: "order_status_changed",
    }),
  });
} catch (triggerErr) {
  console.warn("[logzz-create-order] trigger-flow error:", triggerErr.message);
}
```

Isso vai:
- Encontrar o fluxo "📅 Data de Entrega Agendada"
- Executar `execute-flow` que envia a mensagem WhatsApp ao cliente

**Nenhum outro arquivo precisa ser alterado.** Apenas 1 arquivo: `supabase/functions/logzz-create-order/index.ts`.

### Sobre o status "Desconhecido" na Logzz

O payload foi aceito (status 200, "Webhook processado com sucesso!") mas a Logzz ainda marca como "Desconhecido". Isso é um problema de configuração do **mapeamento no painel da Logzz** (remapeamento do webhook `ori1odgj`). Você precisa completar o remapeamento dos campos no painel deles para que o pedido seja reconhecido corretamente.

