
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quick_replies" ON public.quick_replies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quick_replies" ON public.quick_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quick_replies" ON public.quick_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quick_replies" ON public.quick_replies FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_quick_replies_updated_at BEFORE UPDATE ON public.quick_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
