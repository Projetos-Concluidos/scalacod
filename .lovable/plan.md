

## Plano: Sistema de Gestao de Equipe com Auditoria

### Visao Geral

Implementar um sistema completo de convite e gestao de membros de equipe na aba "Configuracoes", permitindo que o dono da loja (tenant) convide membros com diferentes niveis de acesso, com badges visuais e logs de auditoria.

### Arquitetura de Papeis

```text
Nivel           Badge         Cor        Permissoes
─────────────────────────────────────────────────────────
Dono            DONO          warning    Acesso total + gestao equipe
Admin           ADMIN         info       Tudo exceto excluir loja/equipe
Operador        OPERADOR      success    Pedidos + Leads + Conversas (leitura+escrita)
Visualizador    VIEWER        default    Apenas visualizacao (somente leitura)
```

### Tabelas Novas (3 migrations)

**1. `team_invites`** — Convites pendentes
```sql
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,          -- quem convidou (dono da loja)
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',  -- admin | operator | viewer
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | revoked
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  accepted_at timestamptz
);
```

**2. `team_members`** — Membros aceitos vinculados ao dono
```sql
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,          -- dono da loja
  user_id uuid NOT NULL,           -- membro da equipe
  role text NOT NULL DEFAULT 'viewer',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, user_id)
);
```

**3. `team_audit_logs`** — Logs de auditoria de acoes dos membros
```sql
CREATE TABLE public.team_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  actor_id uuid NOT NULL,          -- quem fez a acao
  actor_email text,
  action text NOT NULL,            -- ex: 'view_order', 'update_status', 'invite_member'
  resource_type text,              -- ex: 'order', 'lead', 'checkout'
  resource_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

Todas com RLS por `owner_id` para o dono e `user_id` para membros verem apenas o que pertencem.

### Frontend — Nova aba "Equipe"

**Arquivo: `src/components/settings/EquipeTab.tsx`**

Secoes:
1. **Convidar Membro** — Form com email + select de papel (Admin/Operador/Visualizador) + botao "Enviar Convite"
2. **Convites Pendentes** — Lista com status, email, papel, data, botao revogar
3. **Membros Ativos** — Tabela com nome, email, badge de papel (usando NinjaBadge), data de entrada, botoes alterar papel / remover
4. **Logs de Auditoria** — Tabela com data, membro (badge), acao, recurso, detalhes (scroll infinito ou paginacao)

**Badges de nivel** (usando NinjaBadge existente):
- Dono → `variant="warning"` com icone coroa
- Admin → `variant="info"`
- Operador → `variant="success"`
- Visualizador → `variant="default"`

### Modificacoes em Configuracoes.tsx

Adicionar a aba "Equipe" apos "Fila WhatsApp":
```typescript
{ value: "equipe", icon: Users, label: "Equipe" }
```

### Limite por Plano

O sistema ja possui `team_members` nos limites dos planos (Starter=1, Pro=3, Enterprise=ilimitado). O convite verificara esse limite antes de enviar.

### Edge Function: `team-invite`

Processa aceite de convite:
- Valida token
- Cria registro em `team_members`
- Atualiza `user_roles` com papel `tenant_agent` (para RLS)
- Marca convite como aceito
- Loga no `team_audit_logs`

### Arquivos envolvidos

| Arquivo | Mudanca |
|---|---|
| Migration SQL (3) | Criar `team_invites`, `team_members`, `team_audit_logs` com RLS |
| `src/components/settings/EquipeTab.tsx` | Novo componente completo |
| `src/pages/Configuracoes.tsx` | Adicionar aba "Equipe" |
| `supabase/functions/team-invite/index.ts` | Edge function para aceitar convites |
| `src/components/TeamRoleBadge.tsx` | Componente badge reutilizavel por papel |

### Fluxo do Usuario

```text
Dono abre Configuracoes → Equipe
  → Digita email + seleciona papel
  → Clica "Enviar Convite"
  → Convite aparece na lista "Pendentes"

Membro recebe link → Acessa /accept-invite?token=xxx
  → Sistema cria conta ou loga
  → Vincula ao time do dono
  → Membro ve o dashboard do dono (com restricoes de papel)

Dono ve logs de auditoria de tudo que membros fizeram
```

### Seguranca

- RLS em todas as tabelas: dono ve tudo, membro ve apenas o que o papel permite
- Convites expiram em 7 dias
- Limite de membros validado server-side na edge function
- Logs de auditoria sao insert-only (sem update/delete para membros)

