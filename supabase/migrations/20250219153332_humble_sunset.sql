/*
  # Add policies for deleting and updating users

  1. Changes
    - Add policy to allow deleting users
    - Add policy to allow updating any user's data

  2. Security
    - Allow anonymous users to delete any user
    - Allow anonymous users to update any user's data
*/

-- Add policy to allow deleting users
CREATE POLICY "Anyone can delete all users"
  ON users FOR DELETE
  TO anon
  USING (true);

-- Add policy to allow updating any user
CREATE POLICY "Anyone can update any user"
  ON users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);