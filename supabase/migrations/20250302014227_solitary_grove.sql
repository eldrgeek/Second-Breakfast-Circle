/*
  # Add default room

  1. New Data
    - Insert default room with ID "00000000-0000-0000-0000-000000000001"
  
  2. Changes
    - Ensures the default room exists for session creation
*/

-- Create rooms table if it doesn't exist
CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on rooms table
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Add policies for rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE tablename = 'rooms' 
    AND policyname = 'Anyone can read rooms'
  ) THEN
    CREATE POLICY "Anyone can read rooms"
      ON rooms FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Insert default room if it doesn't exist
INSERT INTO rooms (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Second Breakfast Circle')
ON CONFLICT (id) DO NOTHING;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;