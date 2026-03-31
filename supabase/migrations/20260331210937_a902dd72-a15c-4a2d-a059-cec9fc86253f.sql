-- Public checkout: anon can read active checkouts
CREATE POLICY "public_checkout_read" ON public.checkouts
  FOR SELECT TO anon
  USING (is_active = true);

-- Public offers: anon can read active offers
CREATE POLICY "public_offers_read" ON public.offers
  FOR SELECT TO anon
  USING (is_active = true);

-- Public products: anon can read active products
CREATE POLICY "public_products_read" ON public.products
  FOR SELECT TO anon
  USING (is_active = true);

-- Public order bumps: anon can read active order bumps
CREATE POLICY "public_order_bumps_read" ON public.order_bumps
  FOR SELECT TO anon
  USING (is_active = true);

-- Public pixel events: anon can insert
CREATE POLICY "public_pixel_insert" ON public.pixel_events
  FOR INSERT TO anon
  WITH CHECK (true);

-- Public orders: anon can insert (checkout submission)
CREATE POLICY "public_order_insert" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (true);

-- Public leads: anon can insert
CREATE POLICY "public_lead_insert" ON public.leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- Unique constraint for leads upsert
ALTER TABLE public.leads ADD CONSTRAINT leads_user_phone_unique
  UNIQUE (user_id, phone);