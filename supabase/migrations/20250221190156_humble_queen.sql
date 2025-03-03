/*
  # Enable realtime for tables

  1. Changes
    - Enable realtime for users table
    - Enable realtime for future tables (user_updates, user_reactions)

  2. Security
    - No changes to existing policies
*/

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- If publication doesn't exist, create it first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;