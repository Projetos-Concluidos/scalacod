
-- =============================================
-- 1. PERFORMANCE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client_phone ON public.orders(client_phone);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_id ON public.orders(checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_logistics_type ON public.orders(logistics_type);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);

CREATE INDEX IF NOT EXISTS idx_pixel_events_user_id ON public.pixel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_created_at ON public.pixel_events(created_at);
CREATE INDEX IF NOT EXISTS idx_pixel_events_event_type ON public.pixel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pixel_events_checkout_id ON public.pixel_events(checkout_id);

CREATE INDEX IF NOT EXISTS idx_flows_user_id ON public.flows(user_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_user_id ON public.checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_slug ON public.checkouts(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);

-- =============================================
-- 2. TRIGGERS updated_at
-- =============================================
CREATE OR REPLACE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_stores
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_integrations
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_flows
  BEFORE UPDATE ON public.flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_checkouts
  BEFORE UPDATE ON public.checkouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_whatsapp_instances
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_voice_tokens
  BEFORE UPDATE ON public.voice_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. REALTIME PUBLICATION
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
