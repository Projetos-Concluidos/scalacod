
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS pixel_facebook TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS meta_capi_token TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS google_ads_id TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS google_conversion_id TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS google_analytics_id TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS thank_you_page_url TEXT;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS whatsapp_support TEXT;
