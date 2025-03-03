/*
  # Fix check_column_exists function

  1. Changes
     - Drop and recreate the check_column_exists function with proper parameter handling
     - Ensure the function is properly registered in the schema
  
  2. Security
     - Maintain security definer setting
     - Keep execute permission for anon role
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS check_column_exists(text, text);

-- Create a new function with explicit parameter names
CREATE OR REPLACE FUNCTION check_column_exists(
  p_table_name text,
  p_column_name text
) RETURNS boolean AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = p_table_name
    AND column_name = p_column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION check_column_exists TO anon;

-- Ensure the function is visible to the API
COMMENT ON FUNCTION check_column_exists(text, text) IS 'Checks if a column exists in a table';