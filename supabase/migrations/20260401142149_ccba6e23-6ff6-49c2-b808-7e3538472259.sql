
-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_key_created ON public.rate_limit_attempts(key, created_at DESC);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;
-- No RLS policies — only service_role can access

-- Helper function: check and record rate limit attempt
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action TEXT,
  p_identifier TEXT,
  p_window_seconds INTEGER,
  p_max_attempts INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_count INTEGER;
BEGIN
  v_key := p_action || ':' || p_identifier;
  
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_attempts
  WHERE key = v_key
    AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Always record the attempt
  INSERT INTO public.rate_limit_attempts (key, action, identifier)
  VALUES (v_key, p_action, p_identifier);
  
  -- Return true if OVER limit
  RETURN v_count >= p_max_attempts;
END;
$$;

-- Cleanup function for old records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_attempts WHERE created_at < NOW() - INTERVAL '1 hour';
$$;
