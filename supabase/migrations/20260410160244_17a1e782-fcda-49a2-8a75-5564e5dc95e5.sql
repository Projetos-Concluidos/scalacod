
-- Drop and recreate the update policy to ensure it's correct
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;

CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id = public.get_effective_user_id())
WITH CHECK (user_id = auth.uid() OR user_id = public.get_effective_user_id());
