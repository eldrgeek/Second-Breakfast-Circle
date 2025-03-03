/*
  # Add tour tracking to users table

  1. Changes
    - Add `has_taken_tour` boolean column to users table
    - Add `last_tour_date` timestamp column to users table
    - Add index on `has_taken_tour` for faster queries
  
  2. Purpose
    - Track whether a user has completed the onboarding tour
    - Store when the user last took the tour
    - Allow tour status to persist across sessions and devices
*/

-- Add tour tracking columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_taken_tour boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_tour_date timestamptz DEFAULT NULL;

-- Add index for tour status queries
CREATE INDEX IF NOT EXISTS users_has_taken_tour_idx ON users(has_taken_tour);