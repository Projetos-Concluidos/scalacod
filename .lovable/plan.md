

## Plano: Adicionar toggle de Notificação Push para Pagamento Aprovado

### Problema
O webhook `coinzz-webhook` já insere notificações push quando um pagamento é aprovado (usando `type: "new_order"`), mas não existe um toggle específico na tela de preferências para "Pagamento aprovado". O usuário não consegue ativar/desativar essa notificação separadamente.

### Correção

**1. Migration SQL** — Adicionar coluna `push_payment_approved` na tabela `notification_preferences`:
```sql
ALTER TABLE notification_preferences
  ADD COLUMN push_payment_approved boolean NOT NULL DEFAULT true;
```

**2. `src/components/settings/NotificacoesTab.tsx`** — Adicionar o campo na interface `Prefs`, nos defaults, no load/save, e no array `pushItems`:
```typescript
// No pushItems, adicionar:
{ key: "push_payment_approved", label: "Pagamento aprovado 💰", hint: "Toca áudio quando pagamento é confirmado" }
```

**3. `src/hooks/useNotificationPush.ts`** — Mapear o tipo `payment_approved` para a nova preferência no `typeMap`.

**4. `supabase/functions/coinzz-webhook/index.ts`** — Alterar o `type` da notificação de `"new_order"` para `"payment_approved"` para distinguir dos pedidos novos e respeitar a preferência individual.

### Arquivos envolvidos
| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar coluna `push_payment_approved` |
| `src/components/settings/NotificacoesTab.tsx` | Novo toggle no UI |
| `src/hooks/useNotificationPush.ts` | Mapear `payment_approved` → `push_payment_approved` |
| `supabase/functions/coinzz-webhook/index.ts` | Usar type `payment_approved` em vez de `new_order` |

### Resultado
- Toggle "Pagamento aprovado 💰" aparece na seção Push
- Notificações de pagamento aprovado podem ser ativadas/desativadas independentemente
- Áudio toca quando pagamento é confirmado (se ativado)

