
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
