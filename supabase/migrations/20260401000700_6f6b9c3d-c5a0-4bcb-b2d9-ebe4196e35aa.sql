
CREATE TABLE public.home_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.home_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_settings_public_read" ON public.home_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "home_settings_admin_update" ON public.home_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "home_settings_admin_insert" ON public.home_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "home_settings_admin_delete" ON public.home_settings
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'superadmin'));
