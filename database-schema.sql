
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  store_name TEXT DEFAULT 'Minha Loja',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', ''), new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
ALTER PUBLICATION supabase_realtime ADD TABLE public.pixel_events;
-- =============================================
-- 1. PERFORMANCE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client_phone ON public.orders(client_phone);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_id ON public.orders(checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_logistics_type ON public.orders(logistics_type);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);

CREATE INDEX IF NOT EXISTS idx_pixel_events_user_id ON public.pixel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_created_at ON public.pixel_events(created_at);
CREATE INDEX IF NOT EXISTS idx_pixel_events_event_type ON public.pixel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pixel_events_checkout_id ON public.pixel_events(checkout_id);

CREATE INDEX IF NOT EXISTS idx_flows_user_id ON public.flows(user_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_user_id ON public.checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_slug ON public.checkouts(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);

-- =============================================
-- 2. TRIGGERS updated_at
-- =============================================
CREATE OR REPLACE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_stores
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_integrations
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_flows
  BEFORE UPDATE ON public.flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_checkouts
  BEFORE UPDATE ON public.checkouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_whatsapp_instances
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_voice_tokens
  BEFORE UPDATE ON public.voice_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. REALTIME PUBLICATION
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

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

ALTER FUNCTION public.validate_subscription_status() SET search_path = public;
ALTER FUNCTION public.validate_subscription_fields() SET search_path = public;
ALTER FUNCTION public.validate_invoice_status() SET search_path = public;

-- admin_action_logs table
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_logs_select" ON public.admin_action_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "superadmin_logs_insert" ON public.admin_action_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Function: admin_add_tokens
CREATE OR REPLACE FUNCTION public.admin_add_tokens(
  p_user_id UUID, p_amount INTEGER, p_reason TEXT
) RETURNS VOID AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles SET token_balance = COALESCE(token_balance, 0) + p_amount WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, metadata)
  VALUES (auth.uid(), 'add_tokens', p_user_id,
    jsonb_build_object('amount', p_amount, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: admin_update_user_plan
CREATE OR REPLACE FUNCTION public.admin_update_user_plan(
  p_user_id UUID, p_plan_id UUID
) RETURNS VOID AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles SET plan_id = p_plan_id, subscription_status = 'active' WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, metadata)
  VALUES (auth.uid(), 'update_plan', p_user_id,
    jsonb_build_object('plan_id', p_plan_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: admin_block_user
CREATE OR REPLACE FUNCTION public.admin_block_user(
  p_user_id UUID, p_block BOOLEAN
) RETURNS VOID AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles SET subscription_status = CASE WHEN p_block THEN 'inactive' ELSE 'active' END WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, metadata)
  VALUES (auth.uid(), CASE WHEN p_block THEN 'block_user' ELSE 'unblock_user' END, p_user_id, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Public checkout: anon can read active checkouts
CREATE POLICY "public_checkout_read" ON public.checkouts
  FOR SELECT TO anon
  USING (is_active = true);

-- Public offers: anon can read active offers
CREATE POLICY "public_offers_read" ON public.offers
  FOR SELECT TO anon
  USING (is_active = true);

-- Public products: anon can read active products
CREATE POLICY "public_products_read" ON public.products
  FOR SELECT TO anon
  USING (is_active = true);

-- Public order bumps: anon can read active order bumps
CREATE POLICY "public_order_bumps_read" ON public.order_bumps
  FOR SELECT TO anon
  USING (is_active = true);

-- Public pixel events: anon can insert
CREATE POLICY "public_pixel_insert" ON public.pixel_events
  FOR INSERT TO anon
  WITH CHECK (true);

-- Public orders: anon can insert (checkout submission)
CREATE POLICY "public_order_insert" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (true);

-- Public leads: anon can insert
CREATE POLICY "public_lead_insert" ON public.leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- Unique constraint for leads upsert
ALTER TABLE public.leads ADD CONSTRAINT leads_user_phone_unique
  UNIQUE (user_id, phone);
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS segment_filter jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS message_template text;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;-- Create audio storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true);

-- RLS for audio bucket: users can upload to their own folder
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = 'voices' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Users can view own audio
CREATE POLICY "Users can view own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = 'voices' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Public read for audio files (needed for playback)
CREATE POLICY "Public can read audio"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'audio');

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access audio"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'audio')
WITH CHECK (bucket_id = 'audio');
-- Table for token purchase records
CREATE TABLE public.token_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pack_id TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  mp_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_token_purchase_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending','paid','failed','refunded') THEN
    RAISE EXCEPTION 'Invalid token purchase status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_token_purchase_status
  BEFORE INSERT OR UPDATE ON public.token_purchases
  FOR EACH ROW EXECUTE FUNCTION public.validate_token_purchase_status();

-- RLS
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token_purchases" ON public.token_purchases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own token_purchases" ON public.token_purchases
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own token_purchases" ON public.token_purchases
  FOR UPDATE USING (user_id = auth.uid());

-- Superadmin full access
CREATE POLICY "Superadmin full access token_purchases" ON public.token_purchases
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

-- Secure function to add tokens
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(p_user_id UUID, p_amount INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Update voice_tokens balance
  UPDATE public.voice_tokens
  SET balance = COALESCE(balance, 0) + p_amount,
      total_purchased = COALESCE(total_purchased, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- If no row existed, insert one
  IF NOT FOUND THEN
    INSERT INTO public.voice_tokens (user_id, balance, total_purchased, total_used)
    VALUES (p_user_id, p_amount, p_amount, 0);
  END IF;
END;
$$;

ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS pixel_facebook TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS meta_capi_token TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS google_ads_id TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS google_conversion_id TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS google_analytics_id TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS thank_you_page_url TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS whatsapp_support TEXT;

CREATE TABLE IF NOT EXISTS public.flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  variables JSONB DEFAULT '{}'::jsonb,
  nodes_executed INTEGER DEFAULT 0,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flow_executions" ON public.flow_executions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own flow_executions" ON public.flow_executions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own flow_executions" ON public.flow_executions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Superadmin full access flow_executions" ON public.flow_executions
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE OR REPLACE FUNCTION public.check_flow_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  -- Skip limit check for official/seeded flows or service-role inserts (no auth.uid)
  IF NEW.is_official = true OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_limit := public.get_user_plan_limit('flows');
  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count FROM public.flows WHERE user_id = NEW.user_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de fluxos atingido (%). Faça upgrade.', v_limit;
  END IF;
  RETURN NEW;
END;
$function$;

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

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read_at) WHERE read_at IS NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_user_provider_unique ON public.whatsapp_instances (user_id, provider);ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_dismissed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_dismissed_at timestamptz;
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  source TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order status history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.orders WHERE id = order_status_history.order_id AND user_id = auth.uid())
  );

CREATE POLICY "Service role can insert status history" ON public.order_status_history
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history(created_at DESC);
INSERT INTO storage.buckets (id, name, public) VALUES ('home-images', 'home-images', true);

CREATE POLICY "Anyone can view home images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'home-images');

CREATE POLICY "Superadmin can upload home images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can update home images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can delete home images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));
-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_key_created ON public.rate_limit_attempts(key, created_at DESC);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;
-- No RLS policies — only service_role can access

-- Helper function: check and record rate limit attempt
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action TEXT,
  p_identifier TEXT,
  p_window_seconds INTEGER,
  p_max_attempts INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_count INTEGER;
BEGIN
  v_key := p_action || ':' || p_identifier;
  
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_attempts
  WHERE key = v_key
    AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Always record the attempt
  INSERT INTO public.rate_limit_attempts (key, action, identifier)
  VALUES (v_key, p_action, p_identifier);
  
  -- Return true if OVER limit
  RETURN v_count >= p_max_attempts;
END;
$$;

-- Cleanup function for old records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_attempts WHERE created_at < NOW() - INTERVAL '1 hour';
$$;

CREATE TABLE IF NOT EXISTS public.message_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  flow_id UUID REFERENCES public.flows(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  process_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_message_queue_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending','processing','sent','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid message_queue status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_message_queue_status
  BEFORE INSERT OR UPDATE ON public.message_queue
  FOR EACH ROW EXECUTE FUNCTION public.validate_message_queue_status();

-- Partial index for efficient pending message lookup
CREATE INDEX idx_message_queue_pending
  ON public.message_queue(user_id, process_after)
  WHERE status = 'pending';

ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queued messages
CREATE POLICY "Users can view own message_queue"
  ON public.message_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert into their own queue
CREATE POLICY "Users can insert own message_queue"
  ON public.message_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own queued messages
CREATE POLICY "Users can update own message_queue"
  ON public.message_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Superadmin full access
CREATE POLICY "Superadmin full access message_queue"
  ON public.message_queue FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Enable realtime for queue status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_queue;

-- Update Starter plan limits
UPDATE public.plans SET
  limits = jsonb_set(
    jsonb_set(
      jsonb_set(limits, '{orders_per_month}', '300'),
      '{leads}', '2000'
    ),
    '{campaigns_per_month}', '5'
  ),
  features = '["3 checkouts ativos","300 pedidos/mês","2.000 leads","5 fluxos de automação","1 instância WhatsApp","Suporte via chat"]'::jsonb
WHERE slug = 'starter';

-- Update Pro plan limits
UPDATE public.plans SET
  limits = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(limits, '{orders_per_month}', '1500'),
        '{leads}', '15000'
      ),
      '{flows}', '25'
    ),
    '{campaigns_per_month}', '15'
  ),
  features = '["10 checkouts ativos","1.500 pedidos/mês","15.000 leads","25 fluxos + IA","3 instâncias WhatsApp","5.000 tokens de voz inclusos","Analytics avançado","API Access"]'::jsonb
WHERE slug = 'pro';

-- Update Enterprise features text
UPDATE public.plans SET
  features = '["Checkouts ilimitados","Pedidos ilimitados","Leads ilimitados","Fluxos ilimitados","10 instâncias WhatsApp","20.000 tokens de voz","Domínio customizado","SLA garantido","Suporte prioritário"]'::jsonb
WHERE slug = 'enterprise';
ALTER TABLE public.flows DROP CONSTRAINT flows_trigger_event_check;

ALTER TABLE public.flows ADD CONSTRAINT flows_trigger_event_check
  CHECK (trigger_event = ANY (ARRAY['order_created','order_status_changed','lead_created','manual','scheduled','scheduled_reminder']::text[]));
-- Fix admin_update_user_plan to also set profiles.plan text field
CREATE OR REPLACE FUNCTION public.admin_update_user_plan(p_user_id uuid, p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT slug INTO v_slug FROM public.plans WHERE id = p_plan_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  UPDATE public.profiles
  SET plan_id = p_plan_id,
      plan = v_slug,
      subscription_status = 'active'
  WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, metadata)
  VALUES (auth.uid(), 'update_plan', p_user_id,
    jsonb_build_object('plan_id', p_plan_id, 'plan_slug', v_slug));
END;
$$;

-- New function: admin_remove_tokens
CREATE OR REPLACE FUNCTION public.admin_remove_tokens(p_user_id uuid, p_amount integer, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_current INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(token_balance, 0) INTO v_current FROM public.profiles WHERE id = p_user_id;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Atual: %, Solicitado: %', v_current, p_amount;
  END IF;

  UPDATE public.profiles SET token_balance = token_balance - p_amount WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, metadata)
  VALUES (auth.uid(), 'remove_tokens', p_user_id,
    jsonb_build_object('amount', p_amount, 'reason', p_reason));
END;
$$;

-- Add unique constraint on user_id
ALTER TABLE public.voice_tokens ADD CONSTRAINT voice_tokens_user_id_unique UNIQUE (user_id);

-- Fix admin_add_tokens to also credit voice_tokens
CREATE OR REPLACE FUNCTION public.admin_add_tokens(p_user_id uuid, p_amount integer, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles SET token_balance = COALESCE(token_balance, 0) + p_amount WHERE id = p_user_id;

  INSERT INTO public.voice_tokens (user_id, total_purchased, total_used)
  VALUES (p_user_id, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET total_purchased = COALESCE(voice_tokens.total_purchased, 0) + p_amount,
      updated_at = now();

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, metadata)
  VALUES (auth.uid(), 'add_tokens', p_user_id,
    jsonb_build_object('amount', p_amount, 'reason', p_reason));
END;
$function$;

-- Fix admin_remove_tokens to also debit voice_tokens
CREATE OR REPLACE FUNCTION public.admin_remove_tokens(p_user_id uuid, p_amount integer, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(token_balance, 0) INTO v_current FROM public.profiles WHERE id = p_user_id;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Atual: %, Solicitado: %', v_current, p_amount;
  END IF;

  UPDATE public.profiles SET token_balance = token_balance - p_amount WHERE id = p_user_id;

  UPDATE public.voice_tokens
  SET total_used = COALESCE(total_used, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, metadata)
  VALUES (auth.uid(), 'remove_tokens', p_user_id,
    jsonb_build_object('amount', p_amount, 'reason', p_reason));
END;
$function$;

-- Fix add_tokens_to_user (purchase flow)
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(p_user_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.voice_tokens (user_id, total_purchased, total_used)
  VALUES (p_user_id, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET total_purchased = COALESCE(voice_tokens.total_purchased, 0) + p_amount,
      updated_at = now();
END;
$function$;

-- Sync existing profiles.token_balance to voice_tokens for users that have balance but no voice_tokens row
INSERT INTO public.voice_tokens (user_id, total_purchased, total_used)
SELECT p.id, COALESCE(p.token_balance, 0), 0
FROM public.profiles p
WHERE p.token_balance > 0
AND NOT EXISTS (SELECT 1 FROM public.voice_tokens vt WHERE vt.user_id = p.id);

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

-- Fix add_tokens_to_user (balance is generated, only touch total_purchased)
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(p_user_id uuid, p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.voice_tokens (user_id, total_purchased, total_used)
  VALUES (p_user_id, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET total_purchased = COALESCE(voice_tokens.total_purchased, 0) + p_amount,
      updated_at = now();
END;
$$;

-- Create atomic debit function (balance is generated from total_purchased - total_used)
CREATE OR REPLACE FUNCTION public.debit_voice_tokens(p_user_id uuid, p_amount integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE public.voice_tokens
  SET total_used = COALESCE(total_used, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND (COALESCE(total_purchased, 0) - COALESCE(total_used, 0)) >= p_amount;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
UPDATE public.whatsapp_instances
SET evolution_server_url = 'https://api-evolution-api.1h7ium.easypanel.host',
    api_key = '429683C4C977415CAAFCCE10F7D57E11'
WHERE id = 'e616f5e3-5d53-44a3-af20-c2fad9e09d68'
  AND provider = 'evolution'
  AND evolution_server_url IS NULL;ALTER TABLE public.orders ADD COLUMN local_operation_code text;
INSERT INTO storage.buckets (id, name, public)
VALUES ('home-images', 'home-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read home images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'home-images');

CREATE POLICY "Admin upload home images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admin update home images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admin delete home images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS coinzz_offer_hash text DEFAULT NULL;ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coinzz_payment_status text,
  ADD COLUMN IF NOT EXISTS coinzz_shipping_status text,
  ADD COLUMN IF NOT EXISTS total_installments integer,
  ADD COLUMN IF NOT EXISTS gateway_fee numeric;ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mp_payment_status text,
  ADD COLUMN IF NOT EXISTS mp_payment_status_detail text;ALTER TABLE public.flows DROP CONSTRAINT flows_flow_type_check;
ALTER TABLE public.flows ADD CONSTRAINT flows_flow_type_check CHECK (flow_type = ANY (ARRAY['cod'::text, 'standard'::text, 'coinzz'::text]));CREATE POLICY "Users can delete own message_queue"
ON public.message_queue
FOR DELETE
USING (auth.uid() = user_id);
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
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

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification_preferences"
ON public.notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification_preferences"
ON public.notification_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification_preferences"
ON public.notification_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.notification_preferences
  ADD COLUMN push_payment_approved boolean NOT NULL DEFAULT true;
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
-- Add RLS policy for team members to view messages
CREATE POLICY "Team members can view owner messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = public.get_effective_user_id()
  )
);

-- Add RLS policy for team admin/operator to insert messages
CREATE POLICY "Team members can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = public.get_effective_user_id()
  )
  AND public.is_team_member_with_role(ARRAY['admin', 'operator'])
);

-- Add RLS policy for team admin/operator to update messages
CREATE POLICY "Team members can update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = public.get_effective_user_id()
  )
  AND public.is_team_member_with_role(ARRAY['admin', 'operator'])
);

-- Add team member RLS for conversations UPDATE (admin/operator)
CREATE POLICY "Team admin/operator can update owner conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (
  user_id = public.get_effective_user_id()
  AND public.is_team_member_with_role(ARRAY['admin', 'operator'])
);

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.conversation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes on own conversations"
ON public.conversation_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE conversations.id = conversation_notes.conversation_id
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "Team members can view notes"
ON public.conversation_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE conversations.id = conversation_notes.conversation_id
  AND conversations.user_id = get_effective_user_id()
));

CREATE POLICY "Users can insert notes on own conversations"
ON public.conversation_notes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE conversations.id = conversation_notes.conversation_id
  AND conversations.user_id = auth.uid()
) AND user_id = auth.uid());

CREATE POLICY "Team members can insert notes"
ON public.conversation_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_notes.conversation_id
    AND conversations.user_id = get_effective_user_id()
  )
  AND is_team_member_with_role(ARRAY['admin', 'operator'])
  AND user_id = auth.uid()
);

CREATE POLICY "Users can delete own notes"
ON public.conversation_notes FOR DELETE
USING (user_id = auth.uid());

CREATE INDEX idx_conversation_notes_conv ON public.conversation_notes(conversation_id);

CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quick_replies" ON public.quick_replies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quick_replies" ON public.quick_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quick_replies" ON public.quick_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quick_replies" ON public.quick_replies FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_quick_replies_updated_at BEFORE UPDATE ON public.quick_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS hyppe_offer_data jsonb DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hyppe_order_id text DEFAULT NULL;ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS provider_priority text DEFAULT 'logzz_first';ALTER TABLE public.integrations DROP CONSTRAINT integrations_type_check;
ALTER TABLE public.integrations ADD CONSTRAINT integrations_type_check CHECK (type = ANY (ARRAY['logzz'::text, 'coinzz'::text, 'mercadopago'::text, 'evolution'::text, 'ycloud'::text, 'meta_whatsapp'::text, 'hyppe'::text]));
-- Remarketing Campaigns
CREATE TABLE public.remarketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_status TEXT NOT NULL DEFAULT 'Frustrado',
  flow_type TEXT NOT NULL DEFAULT 'all',
  checkout_id UUID REFERENCES public.checkouts(id) ON DELETE SET NULL,
  discount_enabled BOOLEAN NOT NULL DEFAULT false,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_progressive BOOLEAN NOT NULL DEFAULT true,
  total_enrolled INTEGER NOT NULL DEFAULT 0,
  total_converted INTEGER NOT NULL DEFAULT 0,
  total_revenue_recovered NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.remarketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own remarketing_campaigns" ON public.remarketing_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own remarketing_campaigns" ON public.remarketing_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own remarketing_campaigns" ON public.remarketing_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own remarketing_campaigns" ON public.remarketing_campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_remarketing_campaigns_updated_at
  BEFORE UPDATE ON public.remarketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Remarketing Steps
CREATE TABLE public.remarketing_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.remarketing_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  delay_days INTEGER NOT NULL DEFAULT 1,
  send_hour TEXT NOT NULL DEFAULT '19:00',
  message_template TEXT NOT NULL DEFAULT '',
  discount_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.remarketing_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own remarketing_steps" ON public.remarketing_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.remarketing_campaigns WHERE id = remarketing_steps.campaign_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own remarketing_steps" ON public.remarketing_steps FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.remarketing_campaigns WHERE id = remarketing_steps.campaign_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own remarketing_steps" ON public.remarketing_steps FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.remarketing_campaigns WHERE id = remarketing_steps.campaign_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own remarketing_steps" ON public.remarketing_steps FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.remarketing_campaigns WHERE id = remarketing_steps.campaign_id AND user_id = auth.uid()));

CREATE TRIGGER update_remarketing_steps_updated_at
  BEFORE UPDATE ON public.remarketing_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Remarketing Enrollments
CREATE TABLE public.remarketing_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.remarketing_campaigns(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, order_id)
);

ALTER TABLE public.remarketing_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own remarketing_enrollments" ON public.remarketing_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own remarketing_enrollments" ON public.remarketing_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own remarketing_enrollments" ON public.remarketing_enrollments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own remarketing_enrollments" ON public.remarketing_enrollments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert enrollments" ON public.remarketing_enrollments FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_remarketing_enrollments_updated_at
  BEFORE UPDATE ON public.remarketing_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_remarketing_campaigns_user_id ON public.remarketing_campaigns(user_id);
CREATE INDEX idx_remarketing_campaigns_active ON public.remarketing_campaigns(is_active) WHERE is_active = true;
CREATE INDEX idx_remarketing_steps_campaign_id ON public.remarketing_steps(campaign_id);
CREATE INDEX idx_remarketing_enrollments_campaign_id ON public.remarketing_enrollments(campaign_id);
CREATE INDEX idx_remarketing_enrollments_status ON public.remarketing_enrollments(status) WHERE status = 'active';
CREATE INDEX idx_remarketing_enrollments_order_id ON public.remarketing_enrollments(order_id);

DROP POLICY "Service role can insert enrollments" ON public.remarketing_enrollments;
