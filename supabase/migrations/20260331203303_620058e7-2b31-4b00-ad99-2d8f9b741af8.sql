
-- =============================================
-- 1. ENUM + USER_ROLES TABLE (separate from profiles per security guidelines)
-- =============================================
CREATE TYPE public.app_role AS ENUM ('superadmin', 'tenant', 'tenant_admin', 'tenant_agent');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (bypasses RLS, no recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Superadmin can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

-- =============================================
-- 2. ADD SUBSCRIPTION FIELDS TO PROFILES
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_id UUID,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;

-- Validation trigger for subscription_status (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_status IS NOT NULL AND NEW.subscription_status NOT IN ('active', 'inactive', 'trial', 'cancelled', 'past_due') THEN
    RAISE EXCEPTION 'Invalid subscription_status: %', NEW.subscription_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_profiles_subscription_status
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_status();

-- =============================================
-- 3. PLANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  mp_plan_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  trial_days INTEGER DEFAULT 7,
  limits JSONB DEFAULT '{}',
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans (pricing page)
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans_admin_insert" ON public.plans FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "plans_admin_update" ON public.plans FOR UPDATE USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "plans_admin_delete" ON public.plans FOR DELETE USING (public.has_role(auth.uid(), 'superadmin'));

-- FK from profiles to plans
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);

-- Seed plans
INSERT INTO public.plans (name, slug, price_monthly, is_featured, sort_order, trial_days, limits, features) VALUES
('Starter', 'starter', 147.00, false, 1, 7,
 '{"checkouts": 3, "orders_per_month": 200, "leads": 1000, "flows": 5, "campaigns_per_month": 3, "whatsapp_instances": 1, "voice_tokens_included": 0, "team_members": 1, "api_access": false, "custom_domain": false, "advanced_analytics": false, "priority_support": false}',
 '["3 checkouts ativos","200 pedidos/mês","1.000 leads","5 fluxos de automação","1 instância WhatsApp","Suporte via chat"]'),
('Pro', 'pro', 297.00, true, 2, 7,
 '{"checkouts": 10, "orders_per_month": 1000, "leads": 10000, "flows": 20, "campaigns_per_month": 10, "whatsapp_instances": 3, "voice_tokens_included": 5000, "team_members": 3, "api_access": true, "custom_domain": false, "advanced_analytics": true, "priority_support": false}',
 '["10 checkouts ativos","1.000 pedidos/mês","10.000 leads","20 fluxos + IA","3 instâncias WhatsApp","5.000 tokens de voz inclusos","Analytics avançado","API Access"]'),
('Enterprise', 'enterprise', 547.00, false, 3, 7,
 '{"checkouts": -1, "orders_per_month": -1, "leads": -1, "flows": -1, "campaigns_per_month": -1, "whatsapp_instances": 10, "voice_tokens_included": 20000, "team_members": -1, "api_access": true, "custom_domain": true, "advanced_analytics": true, "priority_support": true}',
 '["Checkouts ilimitados","Pedidos ilimitados","Leads ilimitados","Fluxos ilimitados","10 instâncias WhatsApp","20.000 tokens de voz","Domínio customizado","SLA garantido"]')
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 4. SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id),
  mp_preapproval_id TEXT UNIQUE,
  mp_preapproval_plan_id TEXT,
  status TEXT DEFAULT 'pending',
  billing_cycle TEXT DEFAULT 'monthly',
  amount DECIMAL(10,2) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  mp_payer_email TEXT,
  mp_card_last4 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_subscription_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending','authorized','paused','cancelled','expired') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;
  IF NEW.billing_cycle NOT IN ('monthly','yearly') THEN
    RAISE EXCEPTION 'Invalid billing_cycle: %', NEW.billing_cycle;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_subscriptions_fields
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_fields();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "subscriptions_delete" ON public.subscriptions
  FOR DELETE USING (public.has_role(auth.uid(), 'superadmin'));

-- =============================================
-- 5. SUBSCRIPTION INVOICES
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.subscriptions(id),
  user_id UUID REFERENCES public.profiles(id),
  mp_payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.validate_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('pending','paid','failed','refunded') THEN
    RAISE EXCEPTION 'Invalid invoice status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_invoice_status_trigger
  BEFORE INSERT OR UPDATE ON public.subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_status();

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON public.subscription_invoices
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "invoices_insert" ON public.subscription_invoices
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "invoices_update" ON public.subscription_invoices
  FOR UPDATE USING (public.has_role(auth.uid(), 'superadmin'));

-- =============================================
-- 6. USAGE LIMITS
-- =============================================
CREATE TABLE IF NOT EXISTS public.usage_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) UNIQUE,
  orders_this_month INTEGER DEFAULT 0,
  campaigns_this_month INTEGER DEFAULT 0,
  month_year TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM'),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select" ON public.usage_limits
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "usage_insert" ON public.usage_limits
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "usage_update" ON public.usage_limits
  FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      subscription_status IN ('active', 'trial')
      OR public.has_role(auth.uid(), 'superadmin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_plan_limit(feature TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  IF public.has_role(auth.uid(), 'superadmin') THEN RETURN -1; END IF;

  SELECT (p.limits->>feature)::INTEGER
  INTO v_limit
  FROM public.profiles pr
  JOIN public.plans p ON p.id = pr.plan_id
  WHERE pr.id = auth.uid();

  RETURN COALESCE(v_limit, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 8. GATEKEEPING TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION public.check_checkout_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  v_limit := public.get_user_plan_limit('checkouts');
  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count FROM public.checkouts WHERE user_id = NEW.user_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de checkouts do seu plano atingido (%). Faça upgrade.', v_limit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_checkout_limit
  BEFORE INSERT ON public.checkouts
  FOR EACH ROW EXECUTE FUNCTION public.check_checkout_limit();

CREATE OR REPLACE FUNCTION public.check_flow_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  v_limit := public.get_user_plan_limit('flows');
  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count FROM public.flows WHERE user_id = NEW.user_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de fluxos atingido (%). Faça upgrade.', v_limit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_flow_limit
  BEFORE INSERT ON public.flows
  FOR EACH ROW EXECUTE FUNCTION public.check_flow_limit();

-- =============================================
-- 9. UPDATE PROFILES RLS FOR SUPERADMIN ACCESS
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- 10. ASSIGN SUPERADMIN ROLE
-- =============================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::app_role FROM public.profiles WHERE email = 'rafaelgcostaa@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
