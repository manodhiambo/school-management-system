-- Migration 069: Add period (e.g. Mid-Term, End-Term, or any custom label) to CBC report cards.
-- Free text rather than a CHECK-constrained enum so schools can type their own period names;
-- the frontend offers system-known values (from cbc_assessments.exam_period) as suggestions.
ALTER TABLE cbc_report_cards
  ADD COLUMN IF NOT EXISTS period VARCHAR(50);
