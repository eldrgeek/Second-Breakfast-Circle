/*
  # Add function to check if a column exists

  1. New Functions
    - `check_column_exists` - Checks if a column exists in a table
  
  2. Purpose
    - Safely check if columns exist before trying to access them
    - Prevent errors when accessing columns that might not exist yet
    - Support graceful fallbacks for new features
*/

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION check_column_exists(
  table_name text,
  column_name text
) RETURNS boolean AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = check_column_exists.table_name
    AND column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION check_column_exists TO anon;