
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  source TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order status history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.orders WHERE id = order_status_history.order_id AND user_id = auth.uid())
  );

CREATE POLICY "Service role can insert status history" ON public.order_status_history
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history(created_at DESC);
