/*
  # Session Management Improvements

  1. New Tables
    - None (using existing tables)
  
  2. Changes
    - Add session_id column to users table
    - Add function to manage session tracking
    - Add trigger for session management
  
  3. Security
    - Maintain existing RLS policies
*/

-- Add session_id column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE users ADD COLUMN session_id text;
  END IF;
END $$;

-- Create index for session_id queries
CREATE INDEX IF NOT EXISTS users_session_id_idx ON users(session_id);

-- Function to handle session management
CREATE OR REPLACE FUNCTION manage_user_session()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user becomes active, ensure they have a session_id
  IF OLD.is_active = false AND NEW.is_active = true AND NEW.session_id IS NULL THEN
    NEW.session_id = gen_random_uuid()::text;
  END IF;
  
  -- When a user becomes inactive, clear their session_id
  IF OLD.is_active = true AND NEW.is_active = false THEN
    NEW.session_id = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session management
DROP TRIGGER IF EXISTS manage_user_session_trigger ON users;
CREATE TRIGGER manage_user_session_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION manage_user_session();