/*
  # Create users and presence tables

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `avatar_url` (text)
      - `seat_number` (integer)
      - `is_active` (boolean)
      - `is_speaking` (boolean)
      - `has_stick` (boolean)
      - `audio_enabled` (boolean)
      - `video_enabled` (boolean)
      - `color` (text)
      - `created_at` (timestamptz)
      - `last_seen` (timestamptz)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users to read all users and update their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  seat_number integer,
  is_active boolean DEFAULT true,
  is_speaking boolean DEFAULT false,
  has_stick boolean DEFAULT false,
  audio_enabled boolean DEFAULT false,
  video_enabled boolean DEFAULT false,
  color text,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read all users
CREATE POLICY "Users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy to allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy to allow users to insert their own data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to update last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_seen on update
CREATE TRIGGER update_last_seen_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();