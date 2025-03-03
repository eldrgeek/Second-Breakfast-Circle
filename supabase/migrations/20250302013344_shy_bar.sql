/*
  # Fix sessions table structure

  1. Changes
    - Modify room_id column to accept text instead of UUID
    - Add missing policies for sessions table
  
  2. Security
    - Ensure RLS is enabled
    - Add proper policies for all operations
*/

-- Modify room_id column to accept text if it's currently a UUID
DO $$ 
BEGIN
  -- Check if the column exists and is a UUID type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'sessions' 
    AND column_name = 'room_id'
    AND data_type = 'uuid'
  ) THEN
    -- Alter the column type to text
    ALTER TABLE sessions ALTER COLUMN room_id TYPE text;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can read sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can delete sessions" ON sessions;

-- Create policies for sessions
CREATE POLICY "Anyone can read sessions"
  ON sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert sessions"
  ON sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update sessions"
  ON sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete sessions"
  ON sessions FOR DELETE
  TO anon
  USING (true);

-- Add to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
  END IF;
END $$;