

## Plano: Acesso de Membros aos Dados do Dono + Gestao Avancada de Equipe

### Problema Principal
O membro `carlosmateuspb@gmail.com` nao consegue ver os pedidos porque:

1. **Convite ainda esta `pending`** — o aceite via `/accept-invite` nao executou a edge function com sucesso (sem logs na function `team-invite`)
2. **RLS bloqueia acesso** — todas as tabelas (orders, leads, conversations, etc.) usam `auth.uid() = user_id`, impedindo qualquer membro de ver dados do dono
3. **Frontend nao tem logica multi-tenant** — as queries sempre buscam dados do usuario logado, sem considerar `team_members`

### Correcao em 4 Partes

---

**Parte 1 — Migration: Funcao helper + RLS para membros**

Criar funcao `security definer` que retorna o `owner_id` se o usuario for membro de um time (ou o proprio `auth.uid()` se for dono):

```sql
CREATE OR REPLACE FUNCTION public.get_effective_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM team_members 
     WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
    auth.uid()
  )
$$;
```

Adicionar politicas RLS nas tabelas principais (orders, leads, conversations, checkouts, flows, etc.) para membros do time:

```sql
-- Exemplo para orders:
CREATE POLICY "Team members can view owner orders"
ON public.orders FOR SELECT
USING (user_id = public.get_effective_user_id());
```

Adicionar politicas de UPDATE/INSERT condicionais por papel (admin/operator podem editar, viewer so le).

---

**Parte 2 — Frontend: Context de equipe**

Criar hook `useTeamContext` que:
- Verifica se o usuario logado e membro de algum time (`team_members`)
- Se sim, retorna o `owner_id` como "usuario efetivo" para queries
- Expoe o papel do membro (`role`) para controlar UI (esconder botoes de delete para viewers, etc.)

Atualizar `Pedidos.tsx` e outras paginas para usar o `effective_user_id` nas queries.

---

**Parte 3 — Gestao avancada na aba Equipe**

Novas funcionalidades no `EquipeTab.tsx`:
- **Status ativo/inativo** — Toggle para desativar membro sem remover
- **Ultimo acesso** — Coluna mostrando quando o membro acessou por ultimo
- **Permissoes detalhadas** — Exibir o que cada papel pode fazer (tooltip/modal)
- **Reenviar convite** — Botao para reenviar convites expirados
- **Filtro de logs** — Filtrar audit logs por membro ou acao

---

**Parte 4 — Fix no aceite de convite**

Investigar e corrigir por que a edge function `team-invite` nao executou (token do membro `carlosmateuspb@gmail.com` ainda esta `pending`). Possivel problema com CORS ou auth header na chamada.

---

### Arquivos envolvidos

| Arquivo | Mudanca |
|---|---|
| Migration SQL | `get_effective_user_id()` + RLS policies para team members em orders, leads, conversations, checkouts, flows |
| `src/hooks/useTeamContext.ts` | Novo hook — retorna effective_user_id e role do membro |
| `src/pages/Pedidos.tsx` | Usar effective_user_id nas queries |
| `src/pages/Dashboard.tsx` | Usar effective_user_id nas queries |
| `src/pages/Leads.tsx` | Usar effective_user_id nas queries |
| `src/pages/Conversas.tsx` | Usar effective_user_id nas queries |
| `src/components/settings/EquipeTab.tsx` | Funcionalidades avancadas de gestao |
| `supabase/functions/team-invite/index.ts` | Debug/fix no aceite |
| `src/pages/AcceptInvite.tsx` | Garantir que invoca a function corretamente |

### Seguranca

- `get_effective_user_id()` usa `SECURITY DEFINER` para evitar recursao RLS
- Viewers so tem SELECT; Operators tem SELECT+UPDATE em orders/leads; Admins tem acesso quase total
- Audit logs registram todas as acoes de membros
- Membros inativos (`is_active = false`) perdem acesso imediatamente via RLS

### Resultado
- Membro aceita convite → ve os pedidos do dono automaticamente
- Dono controla granularmente o que cada membro pode fazer
- Logs de auditoria registram cada acao dos membros

