
-- Add new columns for General Checkout support
ALTER TABLE public.checkouts
  ADD COLUMN IF NOT EXISTS checkout_category text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS cta_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scarcity_timer_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS banner_images jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS download_url text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS font_family text,
  ADD COLUMN IF NOT EXISTS product_cover_url text;

-- Add validation trigger for product_type
CREATE OR REPLACE FUNCTION public.validate_checkout_product_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.product_type IS NOT NULL AND NEW.product_type NOT IN ('dropshipping', 'curso', 'info_produto', 'servico') THEN
    RAISE EXCEPTION 'Invalid product_type: %. Must be dropshipping, curso, info_produto or servico', NEW.product_type;
  END IF;
  IF NEW.checkout_category NOT IN ('cod', 'general') THEN
    RAISE EXCEPTION 'Invalid checkout_category: %. Must be cod or general', NEW.checkout_category;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_checkout_fields
  BEFORE INSERT OR UPDATE ON public.checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_checkout_product_type();
