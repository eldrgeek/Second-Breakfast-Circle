/*
  # Add trigger for inactive user cleanup

  1. Changes
    - Add trigger to clean up user data when they become inactive
    - Ensures user data is properly cleaned up even if beacon request is delayed

  2. Security
    - No changes to existing security policies
*/

-- Function to clean up user data when they become inactive
CREATE OR REPLACE FUNCTION cleanup_inactive_user()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Reset user state when they become inactive
    NEW.has_stick = false;
    NEW.is_speaking = false;
    NEW.audio_enabled = false;
    NEW.video_enabled = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically clean up user data when they become inactive
CREATE TRIGGER cleanup_inactive_user_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.is_active = true AND NEW.is_active = false)
  EXECUTE FUNCTION cleanup_inactive_user();