-- Migration 067: Advanced audit log — device, browser, OS, request metadata

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS user_agent    TEXT,
  ADD COLUMN IF NOT EXISTS device_type   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS browser       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS os            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS http_method   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS request_path  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS status_code   INTEGER;

CREATE INDEX IF NOT EXISTS idx_audit_log_device   ON audit_log(device_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_ip        ON audit_log(ip_address);
