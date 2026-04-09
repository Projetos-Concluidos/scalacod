CREATE OR REPLACE FUNCTION public.delete_checkout_cascade(p_checkout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_order_ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id
  INTO v_owner_id
  FROM public.checkouts
  WHERE id = p_checkout_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Checkout not found';
  END IF;

  IF v_owner_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(array_agg(id), '{}'::uuid[])
  INTO v_order_ids
  FROM public.orders
  WHERE checkout_id = p_checkout_id;

  DELETE FROM public.pixel_events
  WHERE checkout_id = p_checkout_id;

  DELETE FROM public.remarketing_enrollments
  WHERE order_id = ANY(v_order_ids);

  DELETE FROM public.order_status_history
  WHERE order_id = ANY(v_order_ids);

  DELETE FROM public.flow_executions
  WHERE order_id = ANY(v_order_ids);

  DELETE FROM public.message_queue
  WHERE order_id = ANY(v_order_ids);

  DELETE FROM public.leads
  WHERE order_id = ANY(v_order_ids);

  DELETE FROM public.orders
  WHERE id = ANY(v_order_ids);

  DELETE FROM public.remarketing_steps
  WHERE campaign_id IN (
    SELECT id FROM public.remarketing_campaigns WHERE checkout_id = p_checkout_id
  );

  DELETE FROM public.remarketing_campaigns
  WHERE checkout_id = p_checkout_id;

  DELETE FROM public.checkouts
  WHERE id = p_checkout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_checkout_cascade(uuid) TO authenticated;