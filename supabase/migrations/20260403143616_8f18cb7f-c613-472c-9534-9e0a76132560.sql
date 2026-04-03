
-- 1. team_invites
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  accepted_at timestamptz
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own invites" ON public.team_invites FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owner can create invites" ON public.team_invites FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own invites" ON public.team_invites FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own invites" ON public.team_invites FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_team_invites_owner ON public.team_invites(owner_id);
CREATE INDEX idx_team_invites_token ON public.team_invites(token);

-- 2. team_members
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view team members" ON public.team_members FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Member can view own membership" ON public.team_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert team members" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update team members" ON public.team_members FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete team members" ON public.team_members FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_team_members_owner ON public.team_members(owner_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. team_audit_logs
CREATE TABLE public.team_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.team_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view audit logs" ON public.team_audit_logs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert audit logs" ON public.team_audit_logs FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE INDEX idx_team_audit_logs_owner ON public.team_audit_logs(owner_id);
CREATE INDEX idx_team_audit_logs_actor ON public.team_audit_logs(actor_id);
CREATE INDEX idx_team_audit_logs_created ON public.team_audit_logs(created_at DESC);
