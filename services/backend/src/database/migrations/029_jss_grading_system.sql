-- Migration 029: JSS 8-Level Grading System (Kenya 2025 KJSEA)
-- Drops the restrictive CHECK constraint on cbc_grade and adds grade_points column

-- 1. Drop existing CHECK constraint on cbc_grade
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'cbc_assessments'::regclass
    AND conname ILIKE '%cbc_grade%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE cbc_assessments DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

-- 2. Add grade_points column for JSS numeric scoring (1-8)
ALTER TABLE cbc_assessments
  ADD COLUMN IF NOT EXISTS grade_points INTEGER;

-- 3. Widen cbc_grade to accept all sub-levels
ALTER TABLE cbc_assessments
  ALTER COLUMN cbc_grade TYPE VARCHAR(10);

-- 4. Add a permissive check constraint covering all valid values
ALTER TABLE cbc_assessments
  ADD CONSTRAINT cbc_assessments_cbc_grade_check
  CHECK (cbc_grade IN ('EE','ME','AE','BE','EE1','EE2','ME1','ME2','AE1','AE2','BE1','BE2') OR cbc_grade IS NULL);
