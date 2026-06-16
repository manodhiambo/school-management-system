-- Migration 066: Parent "left home" tracking in transport pickups
ALTER TABLE transport_pickups
  ADD COLUMN IF NOT EXISTS parent_left_home_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_left_home_note  TEXT;
