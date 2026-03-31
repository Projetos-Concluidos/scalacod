
-- Table for token purchase records
CREATE TABLE public.token_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pack_id TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  mp_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_token_purchase_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending','paid','failed','refunded') THEN
    RAISE EXCEPTION 'Invalid token purchase status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_token_purchase_status
  BEFORE INSERT OR UPDATE ON public.token_purchases
  FOR EACH ROW EXECUTE FUNCTION public.validate_token_purchase_status();

-- RLS
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token_purchases" ON public.token_purchases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own token_purchases" ON public.token_purchases
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own token_purchases" ON public.token_purchases
  FOR UPDATE USING (user_id = auth.uid());

-- Superadmin full access
CREATE POLICY "Superadmin full access token_purchases" ON public.token_purchases
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

-- Secure function to add tokens
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(p_user_id UUID, p_amount INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Update voice_tokens balance
  UPDATE public.voice_tokens
  SET balance = COALESCE(balance, 0) + p_amount,
      total_purchased = COALESCE(total_purchased, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- If no row existed, insert one
  IF NOT FOUND THEN
    INSERT INTO public.voice_tokens (user_id, balance, total_purchased, total_used)
    VALUES (p_user_id, p_amount, p_amount, 0);
  END IF;
END;
$$;
