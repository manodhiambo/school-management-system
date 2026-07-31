-- Migration 095: Split generic "boarder" student type into full-time and weekly boarders
-- Full-time boarders live at school every night, weekly boarders board Mon-Fri and go home
-- for the weekend, so they need distinct fee structures (weekly boarding is normally billed
-- lower than full-time) and, eventually, distinct hostel/roll-call handling.
--
-- CAUTION: runMigrations.js splits each file on every literal semicolon character,
-- including ones inside double-dash comments (see migration 080) — no semicolons in
-- comment prose anywhere in this file.

-- Students: replace the two-value student_type with three concrete types. Existing 'boarder'
-- rows become 'full_time_boarder' — the closest match to prior behaviour (present every
-- night, billed the full boarding fee).
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_type_check;
UPDATE students SET student_type = 'full_time_boarder' WHERE student_type = 'boarder';
ALTER TABLE students ADD CONSTRAINT students_student_type_check
  CHECK (student_type IN ('day_scholar', 'full_time_boarder', 'weekly_boarder'));

-- Fee structures: 'boarder' is kept as a generic value meaning "applies to both boarder
-- subtypes", so existing boarder-priced fee structures (e.g. a shared facility fee) keep
-- matching both kinds of boarder without any data migration. New fee structures can target
-- 'full_time_boarder' or 'weekly_boarder' specifically for fees that differ between them
-- (e.g. the boarding fee itself) — matching is done in code via feeAppliesToStudentType()
-- in services/backend/src/utils/studentType.js.
ALTER TABLE fee_structure DROP CONSTRAINT IF EXISTS fee_structure_student_type_check;
ALTER TABLE fee_structure ADD CONSTRAINT fee_structure_student_type_check
  CHECK (student_type IN ('all', 'day_scholar', 'boarder', 'full_time_boarder', 'weekly_boarder'));
