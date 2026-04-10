
INSERT INTO storage.buckets (id, name, public) VALUES ('home-assets', 'home-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read home-assets" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'home-assets');

CREATE POLICY "Auth upload home-assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'home-assets');
