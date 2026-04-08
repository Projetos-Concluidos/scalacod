
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
