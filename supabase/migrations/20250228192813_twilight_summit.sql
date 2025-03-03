-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Add policies for sessions (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND policyname = 'Anyone can read sessions'
  ) THEN
    CREATE POLICY "Anyone can read sessions"
      ON sessions FOR SELECT
      TO anon
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND policyname = 'Anyone can insert sessions'
  ) THEN
    CREATE POLICY "Anyone can insert sessions"
      ON sessions FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND policyname = 'Anyone can update sessions'
  ) THEN
    CREATE POLICY "Anyone can update sessions"
      ON sessions FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Function to update session last_active
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update session last_active on update (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_session_last_active_trigger'
  ) THEN
    CREATE TRIGGER update_session_last_active_trigger
      BEFORE UPDATE ON sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_session_last_active();
  END IF;
END $$;

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