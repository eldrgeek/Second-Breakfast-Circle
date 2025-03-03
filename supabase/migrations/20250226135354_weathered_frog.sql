/*
  # Add session management and improve user tracking

  1. Changes
    - Add last_active_at column to track when users were last active
    - Add index on last_active_at for faster queries
    - Update cleanup trigger to handle session state properly
    - Add function to clean up old inactive sessions

  2. Security
    - No changes to RLS policies needed
*/

-- Add last_active_at column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Add index on last_active_at for faster queries
CREATE INDEX IF NOT EXISTS users_last_active_at_idx ON users(last_active_at);

-- Update cleanup trigger to handle session state
CREATE OR REPLACE FUNCTION cleanup_inactive_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_active_at when user becomes inactive
  IF OLD.is_active = true AND NEW.is_active = false THEN
    NEW.last_active_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old inactive sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET is_active = false,
      has_stick = false,
      is_speaking = false,
      audio_enabled = false,
      video_enabled = false,
      last_active_at = now()
  WHERE is_active = true
    AND last_seen < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;