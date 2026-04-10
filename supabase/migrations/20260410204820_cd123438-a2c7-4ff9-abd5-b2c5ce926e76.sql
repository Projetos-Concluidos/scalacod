
-- 1. Admin Pixel Config (singleton)
CREATE TABLE public.admin_pixel_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_pixel_id text,
  google_analytics_id text,
  google_ads_id text,
  google_conversion_id text,
  tiktok_pixel_id text,
  custom_head_scripts text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_pixel_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read pixel config"
  ON public.admin_pixel_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Superadmin can insert pixel config"
  ON public.admin_pixel_config FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can update pixel config"
  ON public.admin_pixel_config FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can delete pixel config"
  ON public.admin_pixel_config FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- 2. Support Tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can create own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Support Messages
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own tickets"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
        AND (support_tickets.user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'))
    )
  );

CREATE POLICY "Users can insert messages on own tickets"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
        AND (support_tickets.user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'))
    )
  );

-- Indexes
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
