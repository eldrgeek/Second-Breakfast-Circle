/*
  # Add session tracking and recent visitors

  1. Changes
    - Add number_of_sessions column to users table
    - Add index on name field for faster lookups
    - Update cleanup trigger logic
    - Add functions for session management

  2. Security
    - Maintain existing RLS policies
*/

-- Add number_of_sessions column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS number_of_sessions integer DEFAULT 1;

-- Add index on name for faster lookups
CREATE INDEX IF NOT EXISTS users_name_idx ON users(name);

-- Update cleanup trigger to handle sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only cleanup when last session is closed
  IF OLD.is_active = true AND NEW.is_active = false AND NEW.number_of_sessions <= 0 THEN
    -- Reset user state when they become inactive
    NEW.has_stick = false;
    NEW.is_speaking = false;
    NEW.audio_enabled = false;
    NEW.video_enabled = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle session counting
CREATE OR REPLACE FUNCTION manage_user_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Increment sessions when activating
    IF OLD.is_active = false AND NEW.is_active = true THEN
      NEW.number_of_sessions = COALESCE(OLD.number_of_sessions, 0) + 1;
    -- Decrement sessions when deactivating
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      NEW.number_of_sessions = GREATEST(COALESCE(OLD.number_of_sessions, 1) - 1, 0);
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.number_of_sessions = 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session management
DROP TRIGGER IF EXISTS manage_user_sessions_trigger ON users;
CREATE TRIGGER manage_user_sessions_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION manage_user_sessions();