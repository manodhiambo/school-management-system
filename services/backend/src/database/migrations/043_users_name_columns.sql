-- Add first_name and last_name columns to users table
-- for roles that don't have a separate profile table (admin, finance_officer)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name  VARCHAR(100);
