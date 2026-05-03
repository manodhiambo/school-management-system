-- Migration 046: Add configurable teacher check-in hours to settings
-- Admin can set when school day starts, when late-after time is, and when check-in closes

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS teacher_checkin_start     VARCHAR(5) DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS teacher_checkin_late_after VARCHAR(5) DEFAULT '08:15',
  ADD COLUMN IF NOT EXISTS teacher_checkin_end       VARCHAR(5) DEFAULT '17:00';

-- Backfill existing rows with defaults
UPDATE settings
SET
  teacher_checkin_start     = COALESCE(teacher_checkin_start,     '08:00'),
  teacher_checkin_late_after = COALESCE(teacher_checkin_late_after, '08:15'),
  teacher_checkin_end       = COALESCE(teacher_checkin_end,       '17:00');

-- Ensure notifications.type is VARCHAR so custom types (teacher_checkin, transport) work
ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50);
