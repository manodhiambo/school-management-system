-- Migration 072: fix user_sessions schema drift
-- The live table predates migration 071 (created by some earlier ad-hoc
-- script), so 071's `CREATE TABLE IF NOT EXISTS user_sessions` was a no-op
-- and never actually added `updated_at` or the UNIQUE(user_id) constraint
-- that authRoutes.js's upsertSession() ON CONFLICT (user_id) requires. Every
-- session upsert has been silently failing (fire-and-forget .catch()) since
-- 071 shipped, breaking refresh-token revocation and, on serverless hosts
-- where the write is awaited, login itself.

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_user_id_key ON user_sessions(user_id);
