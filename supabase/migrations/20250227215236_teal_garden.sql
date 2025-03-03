/*
  # Add tour tracking columns to users table

  1. New Columns
    - `has_taken_tour` - Boolean flag indicating if user has completed the tour
    - `last_tour_date` - Timestamp of when the user last took the tour
  
  2. Purpose
    - Track whether users have completed the onboarding tour
    - Allow tour to be shown only to new users
    - Enable tour restart functionality
*/

-- Add tour tracking columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_taken_tour boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_tour_date timestamptz DEFAULT NULL;

-- Add index for tour status queries
CREATE INDEX IF NOT EXISTS users_has_taken_tour_idx ON users(has_taken_tour);