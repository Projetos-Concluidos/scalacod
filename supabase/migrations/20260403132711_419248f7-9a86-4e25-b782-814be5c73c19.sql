ALTER TABLE public.notification_preferences
  ADD COLUMN push_payment_approved boolean NOT NULL DEFAULT true;