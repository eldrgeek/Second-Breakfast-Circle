/*
  # Add work status updates and reactions

  1. New Tables
    - `user_updates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_reactions`
      - `id` (uuid, primary key)
      - `update_id` (uuid, references user_updates)
      - `user_id` (uuid, references users)
      - `emoji` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for reading and writing
*/

-- Create user_updates table
CREATE TABLE IF NOT EXISTS user_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_reactions table
CREATE TABLE IF NOT EXISTS user_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid REFERENCES user_updates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(update_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE user_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reactions ENABLE ROW LEVEL SECURITY;

-- Add policies for user_updates
CREATE POLICY "Anyone can read updates"
  ON user_updates FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can create updates"
  ON user_updates FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update their own updates"
  ON user_updates FOR UPDATE
  TO anon
  USING (user_id::text = user_id::text)
  WITH CHECK (user_id::text = user_id::text);

-- Add policies for user_reactions
CREATE POLICY "Anyone can read reactions"
  ON user_reactions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can create reactions"
  ON user_reactions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can delete their own reactions"
  ON user_reactions FOR DELETE
  TO anon
  USING (user_id::text = user_id::text);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_updates, user_reactions;