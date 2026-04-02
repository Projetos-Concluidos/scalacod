
-- Fix add_tokens_to_user (balance is generated, only touch total_purchased)
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(p_user_id uuid, p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.voice_tokens (user_id, total_purchased, total_used)
  VALUES (p_user_id, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET total_purchased = COALESCE(voice_tokens.total_purchased, 0) + p_amount,
      updated_at = now();
END;
$$;

-- Create atomic debit function (balance is generated from total_purchased - total_used)
CREATE OR REPLACE FUNCTION public.debit_voice_tokens(p_user_id uuid, p_amount integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE public.voice_tokens
  SET total_used = COALESCE(total_used, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND (COALESCE(total_purchased, 0) - COALESCE(total_used, 0)) >= p_amount;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
