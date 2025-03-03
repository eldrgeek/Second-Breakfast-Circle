/*
  # Add Rooms and Sessions tables

  1. New Tables
    - `rooms`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `created_at` (timestamptz)
      - `sessions` (text[], array of session ids)
    
    - `sessions`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to rooms)
      - `user_id` (uuid, foreign key to users)
      - `last_connected` (timestamptz)
      - `last_disconnected` (timestamptz, nullable)
  
  2. Changes to existing tables
    - Add `sessions` array to `users` table
  
  3. Security
    - Enable RLS on new tables
    - Add policies for anonymous access
*/

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  sessions text[] DEFAULT '{}'
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  last_connected timestamptz DEFAULT now(),
  last_disconnected timestamptz DEFAULT NULL
);

-- Add sessions array to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS sessions text[] DEFAULT '{}';

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Add policies for rooms
CREATE POLICY "Anyone can read rooms"
  ON rooms FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert rooms"
  ON rooms FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update rooms"
  ON rooms FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Add policies for sessions
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

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rooms, sessions;

-- Insert initial rooms
INSERT INTO rooms (name) VALUES 
  ('Second Breakfast Club'),
  ('Room Maker')
ON CONFLICT (id) DO NOTHING;