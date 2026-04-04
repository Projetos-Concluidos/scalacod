## Plano: Itens Importantes (🟡) do Checklist

### Batch 1 — Kanban & UI (esta implementação)

**1. Indicador de tempo "Aguardando" nos cards do Kanban**
- Adicionar badge nos cards mostrando "há Xh" ou "há Xd" para pedidos em "Aguardando"
- Destaque vermelho se > 12h (alerta visual)

**2. Audit log com userId no drag & drop**
- No `Pedidos.tsx`, incluir `user_id` do membro no insert de `order_status_history`
- Adicionar campo `changed_by` no raw_payload para rastreabilidade

**3. Badge de não lidas na sidebar/topbar**
- Consultar `conversations` com `unread_count > 0` via `get_effective_user_id()`
- Exibir badge numérico no item "Conversas" da sidebar e no TopBar

**4. Indicador de janela 24h expirada na conversa**
- Comparar `last_message_at` com `now() - 24h`
- Se expirada, mostrar aviso amarelo e desabilitar campo de texto (só templates)

**5. Atribuição de conversa a agente**
- No painel de detalhes da conversa, dropdown para selecionar membro da equipe
- Atualiza `conversations.assigned_agent` com o `user_id` do membro
- Filtro "Minhas conversas" na lista

### Arquivos envolvidos
| Arquivo | Mudança |
|---|---|
| `src/pages/Pedidos.tsx` | Badge de tempo + audit log com userId |
| `src/components/AppSidebar.tsx` | Badge de não lidas |
| `src/components/TopBar.tsx` | Badge de não lidas |
| `src/pages/Conversas.tsx` | Indicador 24h + atribuição de agente |

### Resultado
- Kanban mais inteligente com indicadores visuais de urgência
- Rastreabilidade completa de quem moveu cada pedido
- Notificação visual de mensagens pendentes
- Gestão de conversas por membro da equipe
