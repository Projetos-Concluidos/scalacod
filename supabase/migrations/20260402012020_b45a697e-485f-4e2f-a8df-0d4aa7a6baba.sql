
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
