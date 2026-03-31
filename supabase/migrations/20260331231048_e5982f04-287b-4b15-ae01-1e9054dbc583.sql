-- Create audio storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true);

-- RLS for audio bucket: users can upload to their own folder
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = 'voices' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Users can view own audio
CREATE POLICY "Users can view own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = 'voices' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Public read for audio files (needed for playback)
CREATE POLICY "Public can read audio"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'audio');

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access audio"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'audio')
WITH CHECK (bucket_id = 'audio');