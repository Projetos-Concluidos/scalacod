INSERT INTO storage.buckets (id, name, public) VALUES ('home-images', 'home-images', true);

CREATE POLICY "Anyone can view home images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'home-images');

CREATE POLICY "Superadmin can upload home images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can update home images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can delete home images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'home-images' AND public.has_role(auth.uid(), 'superadmin'));