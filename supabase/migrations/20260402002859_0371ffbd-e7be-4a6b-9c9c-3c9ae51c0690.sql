
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
