
CREATE OR REPLACE FUNCTION public.delete_order_cascade(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.remarketing_enrollments WHERE order_id = p_order_id OR converted_order_id = p_order_id;
  DELETE FROM public.flow_executions WHERE order_id = p_order_id;
  DELETE FROM public.message_queue WHERE order_id = p_order_id;
  DELETE FROM public.order_status_history WHERE order_id = p_order_id;
  DELETE FROM public.pixel_events WHERE metadata->>'order_id' = p_order_id::text;
  UPDATE public.leads SET order_id = NULL WHERE order_id = p_order_id;
  DELETE FROM public.orders WHERE id = p_order_id;
END;
$$;
