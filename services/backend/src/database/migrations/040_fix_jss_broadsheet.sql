-- Migration 040: Fix JSS broadsheet — widen grade constraint in student_competency_summary
-- to accept 8-level JSS grades (EE1, EE2, ME1, ME2, AE1, AE2, BE1, BE2)

-- 1. Drop the restrictive CHECK constraint on overall_cbc_grade
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'student_competency_summary'::regclass
    AND conname ILIKE '%overall_cbc_grade%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE student_competency_summary DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

-- 2. Widen the column to VARCHAR(10) to hold all sub-level codes
ALTER TABLE student_competency_summary
  ALTER COLUMN overall_cbc_grade TYPE VARCHAR(10);

-- 3. Add a permissive constraint accepting all valid grade values
ALTER TABLE student_competency_summary
  ADD CONSTRAINT student_competency_summary_overall_cbc_grade_check
  CHECK (
    overall_cbc_grade IN (
      'EE','ME','AE','BE',
      'EE1','EE2','ME1','ME2','AE1','AE2','BE1','BE2',
      'WD','D','B'
    ) OR overall_cbc_grade IS NULL
  );
