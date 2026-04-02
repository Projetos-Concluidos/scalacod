
-- Add unique constraint on user_id
ALTER TABLE public.voice_tokens ADD CONSTRAINT voice_tokens_user_id_unique UNIQUE (user_id);
