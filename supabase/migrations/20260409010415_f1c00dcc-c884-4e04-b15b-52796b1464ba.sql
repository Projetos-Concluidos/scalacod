
-- Add product data fields to checkouts for General/PM checkouts
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS product_price numeric DEFAULT NULL;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS product_offer_price numeric DEFAULT NULL;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS product_description text DEFAULT NULL;

-- Add image_url to order_bumps for bump product images
ALTER TABLE public.order_bumps ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Create storage bucket for checkout product images
INSERT INTO storage.buckets (id, name, public) VALUES ('checkout-assets', 'checkout-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Checkout assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'checkout-assets');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload checkout assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'checkout-assets' AND auth.role() = 'authenticated');

-- Users can update their own uploads
CREATE POLICY "Users can update their own checkout assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'checkout-assets' AND auth.role() = 'authenticated');

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own checkout assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'checkout-assets' AND auth.role() = 'authenticated');
