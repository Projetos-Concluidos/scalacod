
ALTER TABLE public.remarketing_enrollments
ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE public.remarketing_enrollments
ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
