ALTER TABLE public.flows DROP CONSTRAINT flows_trigger_event_check;

ALTER TABLE public.flows ADD CONSTRAINT flows_trigger_event_check
  CHECK (trigger_event = ANY (ARRAY['order_created','order_status_changed','lead_created','manual','scheduled','scheduled_reminder']::text[]));