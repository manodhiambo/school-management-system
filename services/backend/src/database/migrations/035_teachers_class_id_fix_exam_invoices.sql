-- Migration 035: Add class_id to teachers + fix EXAMS invoice fee_structure_id links
-- Fixes:
-- 1. Teachers table missing class_id (causes student query to fail for teacher role)
-- 2. EXAMS invoices linked to wrong fee_structure_id (REMEDIAL LESSONS instead of EXAM FEES)

-- 1. Add class_id to teachers (homeroom / class teacher assignment)
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_class_id ON teachers(class_id);

-- 2. Fix EXAMS invoices that incorrectly link to REMEDIAL LESSONS fee_structure
--    instead of the actual EXAM FEES fee_structure
UPDATE fee_invoices
SET fee_structure_id = '34e75302-7e41-45c6-8f8f-c42b36481668'  -- EXAM FEES (2026, amount=300)
WHERE description = 'EXAMS'
  AND fee_structure_id = 'df9c23cf-2794-4177-9f39-a8b2ff731b89'  -- was REMEDIAL LESSONS (wrong)
  AND total_amount = 300;
