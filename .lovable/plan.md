

## Plano: Sistema completo de notificacoes Push com audio

### Situacao atual

1. **NotificacoesTab** — preferencias sao apenas estado local (`useState`), nada e salvo no banco
2. **NotificationBell** — escuta realtime da tabela `notifications`, mas so recebe inserts de pagamento (MercadoPago)
3. **Nenhuma notificacao** e criada para: novo pedido, pedido entregue, pedido frustrado, novo lead
4. **Audio** — existe `public/sounds/push.mp3` usado no chat WhatsApp, mas nao nas notificacoes push
5. **Audio do usuario** — MP3 enviado (`notificação_kiwify.mp3`) deve substituir o som atual para notificacoes de novo pedido

### O que sera implementado

#### 1. Tabela `notification_preferences` (Migration)
Salvar preferencias do usuario no banco em vez de estado local:
```sql
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_new_order boolean DEFAULT true,
  email_delivered boolean DEFAULT true,
  email_frustrated boolean DEFAULT true,
  email_new_lead boolean DEFAULT true,
  email_weekly_report boolean DEFAULT false,
  push_enabled boolean DEFAULT false,
  push_new_order boolean DEFAULT true,
  push_delivered boolean DEFAULT true,
  push_frustrated boolean DEFAULT true,
  push_new_lead boolean DEFAULT true,
  alert_low_tokens boolean DEFAULT false,
  alert_frustrated_orders boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: usuario le/edita apenas seus proprios dados
```

#### 2. Audio de notificacao (`public/sounds/notification_kiwify.mp3`)
Copiar o MP3 enviado pelo usuario para `public/sounds/` — este sera o som tocado em notificacoes push de novo pedido.

#### 3. Hook `useNotificationPush` (novo)
Hook centralizado que:
- Escuta realtime `notifications` (INSERT) 
- Verifica preferencias do usuario (tabela `notification_preferences`)
- Dispara `new Notification()` do browser com titulo/corpo
- Toca audio `notification_kiwify.mp3` quando o tipo for `new_order`
- Montado no `AppLayout` para funcionar em todas as paginas autenticadas

#### 4. Inserir notificacoes nos eventos corretos (Edge Functions)

**`checkout-api/index.ts`** — apos criar pedido com sucesso:
```typescript
await supabase.from("notifications").insert({
  user_id,
  title: "🛒 Novo pedido recebido!",
  body: `Pedido #${order_number} - ${client_name}`,
  type: "new_order",
});
```

**`execute-flow/index.ts`** ou **`trigger-flow/index.ts`** — quando status muda para:
- "Entregue" → tipo `delivered`
- "Frustrado"/"Cancelado" → tipo `frustrated`

**`checkout-api/index.ts`** — quando lead e criado:
```typescript
// tipo "new_lead"
```

#### 5. Reescrever `NotificacoesTab` para persistir no banco
- Carregar preferencias da tabela `notification_preferences` (upsert na primeira vez)
- Salvar alteracoes reais no banco ao clicar "Salvar"
- Secao Push com toggles individuais (espelhando os do email): novo pedido, entregue, frustrado, novo lead
- Botao "Testar notificacao" toca o audio + dispara push real

#### 6. Atualizar `NotificationBell` para tocar audio
Quando receber INSERT realtime com `type = "new_order"`, tocar o audio automaticamente.

### Arquivos a criar/editar

| Arquivo | Acao |
|---------|------|
| `public/sounds/notification_kiwify.mp3` | Copiar MP3 do usuario |
| Migration SQL | Criar tabela `notification_preferences` + RLS |
| `src/hooks/useNotificationPush.ts` | Novo hook centralizado |
| `src/components/settings/NotificacoesTab.tsx` | Reescrever com persistencia |
| `src/components/NotificationBell.tsx` | Adicionar audio no INSERT |
| `src/components/AppLayout.tsx` | Montar hook de push |
| `supabase/functions/checkout-api/index.ts` | Insert notification new_order + new_lead |
| `supabase/functions/execute-flow/index.ts` | Insert notification delivered/frustrated |

### Resultado esperado
- Preferencias salvas no banco e respeitadas
- Push notifications no browser para: novo pedido, entregue, frustrado, novo lead
- Audio "kiwify" toca automaticamente ao receber novo pedido
- Sininho mostra todas as notificacoes em tempo real
- Botao testar funciona com audio + push real

