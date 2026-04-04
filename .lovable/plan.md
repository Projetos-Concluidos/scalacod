## Implementação dos Itens Críticos — Ordem de Prioridade

### 1. Auto-cancelamento de pedidos não pagos após 24h
- Criar Edge Function `expire-unpaid-orders` que:
  - Busca pedidos Coinzz com status "Aguardando" criados há mais de 24h
  - Move para status "Frustrado" automaticamente
  - Registra no `order_status_history`
  - Dispara `trigger-flow` para notificações
  - Insere notificação push
- Configurar cron job para executar a cada hora

### 2. Fix de delays nos fluxos (> 25s falham)
- No `execute-flow`, quando um nó `delay` tem tempo > 25s:
  - Em vez de `setTimeout`, agendar os nós restantes na `message_queue` com `process_after` calculado
  - Marcar a execução como "waiting" e retornar
  - O `process-message-queue` (cron a cada 5min) processa quando chegar a hora

### 3. Fix de branching em nós `condition`
- No `execute-flow`, quando um nó `condition` avalia:
  - Se TRUE → seguir apenas pelo edge "true"
  - Se FALSE → seguir apenas pelo edge "false"
  - Atualmente executa todos os nós subsequentes independente do resultado

### 4. RLS de mensagens para membros da equipe
- Migration: adicionar policy SELECT na tabela `messages` usando `get_effective_user_id()` via join com `conversations`

### Arquivos envolvidos
| Arquivo | Mudança |
|---|---|
| `supabase/functions/expire-unpaid-orders/index.ts` | Novo — cron de expiração |
| `supabase/functions/execute-flow/index.ts` | Fix delays + branching |
| Migration SQL | RLS messages + cron job |
