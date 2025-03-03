/*
  # Fix tour tracking functionality

  1. Changes
     - Fix the query to information_schema.columns
     - Properly add tour tracking columns
     - Update function to check if column exists
  
  2. Security
     - Maintain existing RLS policies
*/

-- Drop the problematic function
DROP FUNCTION IF EXISTS check_column_exists;

-- Create a proper function to check if a column exists
CREATE OR REPLACE FUNCTION check_column_exists(
  schema_name text,
  table_name text,
  column_name text
) RETURNS boolean AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = schema_name
    AND table_name = table_name
    AND column_name = column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION check_column_exists TO anon;

-- Ensure tour tracking columns exist (using IF NOT EXISTS to avoid errors)
DO $$ 
BEGIN
  -- Add tour tracking columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'has_taken_tour'
  ) THEN
    ALTER TABLE users ADD COLUMN has_taken_tour boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'last_tour_date'
  ) THEN
    ALTER TABLE users ADD COLUMN last_tour_date timestamptz DEFAULT NULL;
  END IF;
  
  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND indexname = 'users_has_taken_tour_idx'
  ) THEN
    CREATE INDEX users_has_taken_tour_idx ON users(has_taken_tour);
  END IF;
END $$;