
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_new_order boolean DEFAULT true,
  email_delivered boolean DEFAULT true,
  email_frustrated boolean DEFAULT true,
  email_new_lead boolean DEFAULT true,
  email_weekly_report boolean DEFAULT false,
  push_enabled boolean DEFAULT false,
  push_new_order boolean DEFAULT true,
  push_delivered boolean DEFAULT true,
  push_frustrated boolean DEFAULT true,
  push_new_lead boolean DEFAULT true,
  alert_low_tokens boolean DEFAULT false,
  alert_frustrated_orders boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification_preferences"
ON public.notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification_preferences"
ON public.notification_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification_preferences"
ON public.notification_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
