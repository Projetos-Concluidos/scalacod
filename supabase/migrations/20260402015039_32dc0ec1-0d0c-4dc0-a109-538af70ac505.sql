
CREATE TABLE public.token_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tokens integer NOT NULL,
  price numeric NOT NULL,
  is_active boolean DEFAULT true,
  is_popular boolean DEFAULT false,
  badge_type text DEFAULT null,
  badge_label text DEFAULT null,
  sort_order integer DEFAULT 0,
  original_price numeric DEFAULT null,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.token_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_packs_public_read" ON public.token_packs
  FOR SELECT USING (true);

CREATE POLICY "token_packs_admin_insert" ON public.token_packs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "token_packs_admin_update" ON public.token_packs
  FOR UPDATE USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "token_packs_admin_delete" ON public.token_packs
  FOR DELETE USING (public.has_role(auth.uid(), 'superadmin'));

INSERT INTO public.token_packs (name, slug, tokens, price, sort_order) VALUES
  ('Pack Iniciante', 'starter', 5000, 19.90, 1),
  ('Pack Essencial', 'essencial', 10000, 39.90, 2),
  ('Pack Profissional', 'profissional', 50000, 197.00, 3),
  ('Pack Enterprise', 'enterprise', 100000, 397.00, 4);

UPDATE public.token_packs SET is_popular = true WHERE slug = 'profissional';
