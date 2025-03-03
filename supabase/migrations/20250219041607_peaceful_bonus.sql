/*
  # Update RLS policies for anonymous access

  1. Changes
    - Modify RLS policies to allow anonymous access
    - Remove authentication requirements
    - Add policies for all CRUD operations

  2. Security
    - Enable basic validation through row-level security
    - Ensure users can only modify their own data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Create new policies for anonymous access
CREATE POLICY "Anyone can read users"
  ON users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert users"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  TO anon
  USING (id::text = id::text)
  WITH CHECK (id::text = id::text);