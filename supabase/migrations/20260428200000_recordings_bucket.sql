/*
  # Recordings storage bucket

  Creates the private `recordings` bucket for async-video user updates and
  RLS policies on storage.objects scoped to bucket_id = 'recordings'.

  Expected object layout: <user_id>/<recording_id>.webm
  and optional thumbnails: <user_id>/<recording_id>-thumb.jpg
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can read recordings" ON storage.objects;
DROP POLICY IF EXISTS "Owner can insert recordings" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update recordings" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete recordings" ON storage.objects;

CREATE POLICY "Authenticated can read recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'recordings');

CREATE POLICY "Owner can insert recordings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner can update recordings"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner can delete recordings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
