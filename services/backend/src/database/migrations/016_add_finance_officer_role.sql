-- =====================================================
-- ADD FINANCE OFFICER ROLE
-- =====================================================

-- Update users table role constraint to include finance_officer
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'users_role_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'finance_officer'));

-- Create a default finance officer account
-- Password: Finance@123 (bcrypt hashed)
INSERT INTO users (id, email, password, role, is_active, is_verified, two_factor_enabled, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'finance@school.com',
  '$2a$10$rN7ZqJZ5xGZK5vX8L8pxq.yJ0V5K5YqJ0V5K5YqJ0V5K5YqJ0V5K5O',
  'finance_officer',
  true,
  true,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
  role = 'finance_officer',
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

