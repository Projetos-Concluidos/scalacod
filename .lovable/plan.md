

# Plano: Correção de Notificações + Pixel Admin + Sistema de Tickets

## Relatório de Análise das Notificações

### O que FUNCIONA:
- **useNotificationPush** (AppLayout): Escuta inserts na tabela `notifications` via realtime, verifica `push_enabled` e preferências por tipo antes de tocar som/notificar. Funciona corretamente para: `new_order`, `payment_approved`, `delivered`, `frustrated`, `new_lead`, `low_tokens`.
- **Salvamento de preferências**: Upsert na tabela `notification_preferences` funciona.
- **Botão testar push**: Funcional.

### O que NÃO FUNCIONA (BUG):
- **`useNotificationSound` em Conversas.tsx (linha 369)**: Toca som em TODA mensagem inbound (`playNotification()`) SEM verificar preferências do usuário. Este é o motivo do "Novo Lead" notificar com som mesmo desativado — qualquer mensagem inbound no WhatsApp toca `push.mp3` incondicionalmente.

### O que FALTA:
- E-mail notifications não estão implementadas (apenas as preferências existem, não há envio real).
- Alertas de saldo/frustrados não têm cron/trigger para disparar.

---

## 1. Correção do Bug de Som (useNotificationSound)

Modificar `src/pages/Conversas.tsx` para verificar preferências do usuário antes de tocar o som em mensagens inbound:
- Buscar `notification_preferences` do usuário ao montar
- Só tocar som se `push_enabled = true` E `push_new_lead = true` (ou tipo relevante)

## 2. Pixel do Administrador (Rastreamento da Home)

Criar na área administrativa uma nova aba/seção **"Pixel & Tracking"** para configurar pixels do projeto:
- Campos: Facebook Pixel ID, Google Analytics/Ads ID, Google Conversion ID
- Salvar na tabela `home_settings` (seção `tracking`) ou criar tabela `admin_pixel_config`
- Na Home pública (`src/pages/Home.tsx`): carregar config e inicializar `FacebookPixel` e `GoogleAds` da `src/lib/pixel.ts` automaticamente
- Eventos rastreados: PageView na Home, clique em CTAs, navegação para /planos, /register

### Migração SQL:
```sql
CREATE TABLE public.admin_pixel_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_pixel_id text,
  google_analytics_id text,
  google_ads_id text,
  google_conversion_id text,
  tiktok_pixel_id text,
  custom_head_scripts text,
  updated_at timestamptz DEFAULT now()
);
-- Apenas 1 row (singleton), RLS: superadmin write, public read
```

### Arquivos:
- `src/pages/admin/AdminPixel.tsx` — nova página admin
- `src/components/admin/AdminSidebar.tsx` — adicionar link
- `src/App.tsx` — adicionar rota `/admin/pixel`
- `src/pages/Home.tsx` — carregar e inicializar pixels

## 3. Sistema de Tickets de Suporte

### Tabelas:
```sql
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'geral',
  priority text DEFAULT 'normal',
  status text DEFAULT 'open', -- open, in_progress, resolved, closed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  is_admin boolean DEFAULT false,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```
Com RLS: usuários veem seus tickets, admins veem todos.

### Para assinantes (src/pages/Suporte.tsx):
- Adicionar seção "Meus Tickets" com lista de tickets e status
- Formulário para abrir ticket: assunto, categoria (bug, dúvida, financeiro, sugestão), descrição, prioridade
- Modal de conversa para ver respostas e responder
- Indicador de SLA: "Tempo de resposta: até 1h"

### Para administrador:
- Nova página `src/pages/admin/AdminTickets.tsx` com lista de todos os tickets
- Filtros por status, prioridade, usuário
- Interface para responder tickets com campo de texto
- Ao responder, marcar status como `in_progress`
- Botão para resolver/fechar ticket

### Notificação ao admin:
- Ao criar ticket, inserir notificação na tabela `notifications` para todos os superadmins
- Título: "Novo ticket de suporte #ID"
- Body: "Assunto: {subject} — Por: {user_email}"

### Rota admin:
- `src/App.tsx`: `/admin/tickets`
- `src/components/admin/AdminSidebar.tsx`: link "Tickets"

## Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `src/pages/Conversas.tsx` | Fix som inbound |
| `src/pages/admin/AdminPixel.tsx` | Criar |
| `src/pages/admin/AdminTickets.tsx` | Criar |
| `src/pages/Suporte.tsx` | Adicionar seção tickets |
| `src/components/admin/AdminSidebar.tsx` | +2 links |
| `src/App.tsx` | +2 rotas admin |
| `src/pages/Home.tsx` | Inicializar pixels |
| Migração SQL | 3 tabelas + RLS |

