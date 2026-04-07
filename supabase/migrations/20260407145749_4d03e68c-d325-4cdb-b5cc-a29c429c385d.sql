ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS hyppe_offer_data jsonb DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hyppe_order_id text DEFAULT NULL;