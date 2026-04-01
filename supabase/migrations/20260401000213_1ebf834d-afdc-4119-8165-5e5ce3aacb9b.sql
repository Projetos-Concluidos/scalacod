
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
