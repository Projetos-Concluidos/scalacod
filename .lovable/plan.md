

## Relatorio de Diagnostico + Plano de Correcao

### 1. Por que a mensagem WhatsApp NAO foi enviada

**Causa raiz identificada nos logs:**

O flow "📅 Data de Entrega Agendada" foi disparado com sucesso pelo `trigger-flow`, porem retornou:
```
"skipped": true, "reason": "already_executed"
```

Isso aconteceu porque esse mesmo pedido (`d55d37e0`) ja tinha sido movido para "Agendado" anteriormente (em 02/04 via kanban_drag), e o flow foi executado naquela vez com status `completed` na tabela `flow_executions`. Quando o pedido foi enviado novamente para a Logzz em 03/04 e teve sucesso, o sistema de deduplicacao bloqueou o reenvio da mensagem.

**O problema:** A deduplicacao atual verifica apenas `flow_id + order_id + status=completed`, sem considerar que o pedido pode ter voltado para outro status e retornado ao mesmo. A logica deveria permitir re-execucao quando houve uma transicao intermediaria (ex: Agendado → Aguardando → Agendado).

### 2. Fluxo bidirecional de cancelamento (ScalaCOD ↔ Logzz)

**Estado atual:**
- **Logzz → ScalaCOD**: Funciona via `process_logzz_webhook` no `checkout-api`. Quando a Logzz envia um status de cancelamento, o sistema atualiza o pedido e dispara o flow "❌ Pedido Cancelado".
- **ScalaCOD → Logzz**: **NAO EXISTE**. Quando o usuario cancela um pedido no Kanban ou via botao "Cancelar Pedido", apenas atualiza o banco local. Nao notifica a Logzz.

A Logzz nao possui uma API publica documentada para cancelar pedidos via server-to-server. O cancelamento precisaria ser feito via webhook reverso ou manualmente no painel Logzz.

### Plano de Implementacao

**Arquivo: `supabase/functions/trigger-flow/index.ts`**

Corrigir a logica de deduplicacao (linhas 92-108). Em vez de verificar apenas se o flow ja foi executado para aquele pedido, verificar se houve uma transicao de status intermediaria apos a ultima execucao:

```text
Logica atual (incorreta):
  SELECT FROM flow_executions WHERE flow_id=X AND order_id=Y AND status=completed → skip

Logica corrigida:
  SELECT FROM flow_executions WHERE flow_id=X AND order_id=Y AND status=completed
  → Se existe, verificar se houve mudanca de status APOS a execucao anterior
  → Se houve (ex: Agendado→Aguardando→Agendado), permitir re-execucao
```

Concretamente: buscar a `created_at` da ultima execucao completada, e verificar se existe um registro em `order_status_history` com `from_status = trigger_status` (saindo do status) e `created_at` posterior. Se existir, significa que o pedido passou por outro status e voltou, entao a re-execucao e valida.

**Arquivo: `src/pages/Pedidos.tsx`**

No `cancelMutation`, alem de atualizar o status local, disparar o `trigger-flow` com `newStatus: "Frustrado"` para que o flow de cancelamento envie a mensagem WhatsApp:

```text
cancelMutation:
  1. Update order status → "Frustrado" (ja existe)
  2. Insert order_status_history (ja existe)  
  3. NOVO: Chamar trigger-flow com newStatus="Frustrado"
```

### Resultado esperado
- Mensagens WhatsApp serao enviadas mesmo quando um pedido retorna ao mesmo status (ex: re-agendamento)
- Cancelamento manual no ScalaCOD dispara automaticamente o flow "❌ Pedido Cancelado" com mensagem WhatsApp

