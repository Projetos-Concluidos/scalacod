
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
