-- Add RLS policy for team members to view messages
CREATE POLICY "Team members can view owner messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = public.get_effective_user_id()
  )
);

-- Add RLS policy for team admin/operator to insert messages
CREATE POLICY "Team members can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = public.get_effective_user_id()
  )
  AND public.is_team_member_with_role(ARRAY['admin', 'operator'])
);

-- Add RLS policy for team admin/operator to update messages
CREATE POLICY "Team members can update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = public.get_effective_user_id()
  )
  AND public.is_team_member_with_role(ARRAY['admin', 'operator'])
);

-- Add team member RLS for conversations UPDATE (admin/operator)
CREATE POLICY "Team admin/operator can update owner conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (
  user_id = public.get_effective_user_id()
  AND public.is_team_member_with_role(ARRAY['admin', 'operator'])
);

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
