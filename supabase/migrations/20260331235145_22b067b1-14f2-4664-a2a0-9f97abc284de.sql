
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
