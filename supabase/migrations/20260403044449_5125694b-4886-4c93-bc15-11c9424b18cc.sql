CREATE POLICY "Users can delete own message_queue"
ON public.message_queue
FOR DELETE
USING (auth.uid() = user_id);