
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS segment_filter jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS message_template text;
