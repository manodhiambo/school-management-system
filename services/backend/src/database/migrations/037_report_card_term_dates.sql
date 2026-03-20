-- Migration 037: Add closing_date and opening_date to cbc_report_cards
-- Allows schools to specify exact term closing and next term opening dates on report cards

ALTER TABLE cbc_report_cards
  ADD COLUMN IF NOT EXISTS closing_date DATE,
  ADD COLUMN IF NOT EXISTS opening_date DATE;
