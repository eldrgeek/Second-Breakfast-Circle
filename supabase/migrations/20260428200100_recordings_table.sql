/*
  # Recordings table + extend user_updates with recording fields

  1. New table `recordings`
     - id (uuid PK)
     - user_id (uuid FK -> users)
     - room_id (text, nullable)
     - url (text)
     - duration_seconds (int, 1..600)
     - thumbnail_url (text, nullable)
     - size_bytes (bigint, nullable; capped at 100MB via check)
     - created_at (timestamptz)

  2. Extend `user_updates` with recording_url, recording_duration_seconds,
     recording_thumbnail_url so the existing update feed can surface
     async-video posts without a join.

  3. RLS:
     - SELECT: anon can read (matches existing user_updates policies)
     - INSERT/UPDATE/DELETE: only the owner (user_id = auth.uid())
*/

CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id text,
  url text NOT NULL,
  duration_seconds int CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 600),
  thumbnail_url text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes <= 104857600),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recordings_user_id_idx ON recordings(user_id);
CREATE INDEX IF NOT EXISTS recordings_created_at_idx ON recordings(created_at DESC);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read recordings" ON recordings;
DROP POLICY IF EXISTS "Owners can insert recordings" ON recordings;
DROP POLICY IF EXISTS "Owners can update recordings" ON recordings;
DROP POLICY IF EXISTS "Owners can delete recordings" ON recordings;

CREATE POLICY "Anyone can read recordings"
  ON recordings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owners can insert recordings"
  ON recordings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can update recordings"
  ON recordings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete recordings"
  ON recordings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE user_updates
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS recording_duration_seconds int,
  ADD COLUMN IF NOT EXISTS recording_thumbnail_url text;

ALTER TABLE user_updates
  DROP CONSTRAINT IF EXISTS user_updates_recording_duration_check;

ALTER TABLE user_updates
  ADD CONSTRAINT user_updates_recording_duration_check
  CHECK (recording_duration_seconds IS NULL OR recording_duration_seconds BETWEEN 1 AND 600);

ALTER PUBLICATION supabase_realtime ADD TABLE recordings;

CREATE OR REPLACE FUNCTION delete_recording_storage_object()
RETURNS TRIGGER AS $$
DECLARE
  object_path text;
BEGIN
  IF OLD.url IS NOT NULL THEN
    object_path := regexp_replace(OLD.url, '^.*/recordings/', '');
    DELETE FROM storage.objects
    WHERE bucket_id = 'recordings' AND name = object_path;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS recordings_storage_cleanup ON recordings;
CREATE TRIGGER recordings_storage_cleanup
  AFTER DELETE ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION delete_recording_storage_object();
