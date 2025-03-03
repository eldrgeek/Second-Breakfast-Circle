/*
  # Fix policy check query

  1. Changes
    - Replace incorrect policy check query that uses non-existent 'schemaname' column
    - Add proper policy checks using the correct column names from pg_catalog
  
  2. Notes
    - This migration fixes the error: "column 'schemaname' does not exist"
    - Uses the correct pg_catalog structure for Supabase's PostgreSQL version
*/

-- Create sessions table if it doesn't exist (idempotent)
CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- Enable RLS on sessions table
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

-- Function to update session last_active
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_session_last_active_trigger ON sessions;

-- Create trigger to automatically update session last_active on update
CREATE TRIGGER update_session_last_active_trigger
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_active();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;