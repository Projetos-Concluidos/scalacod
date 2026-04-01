
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value jsonb,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_config_public_read" ON public.system_config
  FOR SELECT USING (true);

CREATE POLICY "system_config_admin_all" ON public.system_config
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

INSERT INTO public.system_config (key, value, description) VALUES
('platform_name', '"ScalaNinja"', 'Nome da plataforma'),
('support_whatsapp', '"5594999999999"', 'WhatsApp de suporte'),
('support_email', '"suporte@scalaninja.com"', 'Email de suporte'),
('maintenance_mode', 'false', 'Modo de manutenção ativo'),
('onboarding_flow_enabled', 'true', 'Seed de fluxos padrão para novos tenants')
ON CONFLICT (key) DO NOTHING;
