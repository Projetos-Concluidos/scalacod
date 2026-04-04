
CREATE TABLE public.conversation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes on own conversations"
ON public.conversation_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE conversations.id = conversation_notes.conversation_id
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "Team members can view notes"
ON public.conversation_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE conversations.id = conversation_notes.conversation_id
  AND conversations.user_id = get_effective_user_id()
));

CREATE POLICY "Users can insert notes on own conversations"
ON public.conversation_notes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE conversations.id = conversation_notes.conversation_id
  AND conversations.user_id = auth.uid()
) AND user_id = auth.uid());

CREATE POLICY "Team members can insert notes"
ON public.conversation_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_notes.conversation_id
    AND conversations.user_id = get_effective_user_id()
  )
  AND is_team_member_with_role(ARRAY['admin', 'operator'])
  AND user_id = auth.uid()
);

CREATE POLICY "Users can delete own notes"
ON public.conversation_notes FOR DELETE
USING (user_id = auth.uid());

CREATE INDEX idx_conversation_notes_conv ON public.conversation_notes(conversation_id);
