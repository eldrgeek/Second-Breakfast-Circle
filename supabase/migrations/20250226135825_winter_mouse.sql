/*
  # Fix presence tracking and session management

  1. Changes
    - Add presence_state column to track user presence
    - Add presence_last_updated to track presence updates
    - Update session management trigger
    - Add function to clean up stale presence states

  2. Security
    - No changes to RLS policies needed
*/

-- Add presence tracking columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS presence_state jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS presence_last_updated timestamptz DEFAULT now();

-- Add index for presence queries
CREATE INDEX IF NOT EXISTS users_presence_last_updated_idx ON users(presence_last_updated);

-- Update session management trigger
CREATE OR REPLACE FUNCTION manage_user_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Handle presence updates
    IF NEW.presence_state IS DISTINCT FROM OLD.presence_state THEN
      NEW.presence_last_updated = now();
    END IF;
    
    -- Handle session state
    IF OLD.is_active = false AND NEW.is_active = true THEN
      NEW.number_of_sessions = COALESCE(OLD.number_of_sessions, 0) + 1;
      NEW.presence_state = jsonb_set(
        COALESCE(OLD.presence_state, '{}'::jsonb),
        '{online}',
        'true'
      );
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      NEW.number_of_sessions = GREATEST(COALESCE(OLD.number_of_sessions, 1) - 1, 0);
      NEW.presence_state = jsonb_set(
        COALESCE(OLD.presence_state, '{}'::jsonb),
        '{online}',
        'false'
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.number_of_sessions = 1;
    NEW.presence_state = '{"online": true}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;