
CREATE OR REPLACE FUNCTION public.get_effective_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.team_members
     WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
    auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_member_with_role(_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid() AND is_active = true AND role = ANY(_roles)
  )
$$;

CREATE POLICY "Team members can view owner orders"
ON public.orders FOR SELECT TO authenticated
USING (user_id = public.get_effective_user_id());

CREATE POLICY "Team admin/operator can update owner orders"
ON public.orders FOR UPDATE TO authenticated
USING (user_id = public.get_effective_user_id() AND public.is_team_member_with_role(ARRAY['admin','operator']));

CREATE POLICY "Team members can view owner leads"
ON public.leads FOR SELECT TO authenticated
USING (user_id = public.get_effective_user_id());

CREATE POLICY "Team admin/operator can update owner leads"
ON public.leads FOR UPDATE TO authenticated
USING (user_id = public.get_effective_user_id() AND public.is_team_member_with_role(ARRAY['admin','operator']));

CREATE POLICY "Team members can view owner conversations"
ON public.conversations FOR SELECT TO authenticated
USING (user_id = public.get_effective_user_id());

CREATE POLICY "Team members can view owner checkouts"
ON public.checkouts FOR SELECT TO authenticated
USING (user_id = public.get_effective_user_id());

CREATE POLICY "Team members can view owner flows"
ON public.flows FOR SELECT TO authenticated
USING (user_id = public.get_effective_user_id());

CREATE POLICY "Team members can view owner integrations"
ON public.integrations FOR SELECT TO authenticated
USING (user_id = public.get_effective_user_id());

CREATE POLICY "Team members can view owner products"
ON public.products FOR SELECT TO authenticated
USING (user_id = public.get_effective_user_id());

CREATE POLICY "Team members can view owner offers"
ON public.offers FOR SELECT TO authenticated
USING (user_id = public.get_effective_user_id());

CREATE POLICY "Members can view own membership"
ON public.team_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Team members can view audit logs"
ON public.team_audit_logs FOR SELECT TO authenticated
USING (owner_id = public.get_effective_user_id());

CREATE POLICY "Team members can view owner profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = public.get_effective_user_id());
