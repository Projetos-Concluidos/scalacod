
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS affiliate_code text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_code text DEFAULT NULL;
