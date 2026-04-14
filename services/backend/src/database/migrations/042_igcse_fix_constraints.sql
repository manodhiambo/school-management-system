-- Migration 042: Fix IGCSE grade_boundaries unique constraint
-- The original UNIQUE(grading_system_id, exam_session_id, grade) fails when
-- exam_session_id is NULL because PostgreSQL treats NULL != NULL in unique constraints.
-- Replace with a functional unique index using COALESCE.

-- Drop the old constraint if it exists (safe to run multiple times)
DO $$
BEGIN
  -- Find and drop any unique constraint on igcse_grade_boundaries
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'igcse_grade_boundaries'
      AND constraint_type = 'UNIQUE'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE igcse_grade_boundaries DROP CONSTRAINT ' || quote_ident(constraint_name)
      FROM information_schema.table_constraints
      WHERE table_name = 'igcse_grade_boundaries'
        AND constraint_type = 'UNIQUE'
      LIMIT 1
    );
  END IF;
END $$;

-- Add functional unique index that handles NULLs correctly
CREATE UNIQUE INDEX IF NOT EXISTS uidx_igcse_boundary
  ON igcse_grade_boundaries(grading_system_id, COALESCE(exam_session_id, -1), grade);
