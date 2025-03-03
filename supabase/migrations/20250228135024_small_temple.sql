/*
  # Fix column check function

  1. Changes
     - Create a simplified version of check_column_exists with correct parameter order
     - Make the function work with just table_name and column_name parameters
  
  2. Security
     - Maintain security definer setting
     - Keep execute permission for anon role
*/

-- Drop the problematic function
DROP FUNCTION IF EXISTS check_column_exists(text, text, text);

-- Create a simpler function with just the parameters we need
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
    WHERE table_schema = 'public'
    AND table_name = check_column_exists.table_name
    AND column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION check_column_exists TO anon;