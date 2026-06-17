-- Migration 068: Device blacklist + user-level blacklist (superadmin security controls)

CREATE TABLE IF NOT EXISTS device_blacklist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address      VARCHAR(50),
  user_agent      TEXT,
  reason          TEXT,
  blacklisted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT device_blacklist_target_chk CHECK (ip_address IS NOT NULL OR user_agent IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_device_blacklist_ip     ON device_blacklist(ip_address) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_device_blacklist_ua     ON device_blacklist(user_agent) WHERE is_active;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blacklisted    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blacklist_reason  TEXT,
  ADD COLUMN IF NOT EXISTS blacklisted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blacklisted_by    UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_blacklisted ON users(is_blacklisted) WHERE is_blacklisted;
