-- Migration 031: Add uses_transport flag to students
-- Tracks whether a student uses school transport (independent of route assignment)

ALTER TABLE students ADD COLUMN IF NOT EXISTS uses_transport BOOLEAN DEFAULT FALSE;

-- Index for bulk billing queries
CREATE INDEX IF NOT EXISTS idx_students_uses_transport ON students(tenant_id, uses_transport) WHERE uses_transport = TRUE;
