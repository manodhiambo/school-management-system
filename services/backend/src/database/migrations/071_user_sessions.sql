-- Migration 071: user_sessions table for refresh-token revocation
-- authRoutes.js login/logout/refresh-token already reference this table (DELETE on
-- logout, lookup expected on refresh) but it was never created, so logout was a
-- silent no-op and refresh tokens stayed valid until their 7-day JWT expiry with
-- no way to revoke them early. One row per user (single active session) — a new
-- login replaces the previous session's refresh token, invalidating it.

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
