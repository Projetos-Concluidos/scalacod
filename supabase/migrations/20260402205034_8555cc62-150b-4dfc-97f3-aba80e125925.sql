ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coinzz_payment_status text,
  ADD COLUMN IF NOT EXISTS coinzz_shipping_status text,
  ADD COLUMN IF NOT EXISTS total_installments integer,
  ADD COLUMN IF NOT EXISTS gateway_fee numeric;