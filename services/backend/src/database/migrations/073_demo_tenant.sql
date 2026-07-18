-- Migration 073: Demo tenant support
-- Flags a single tenant as the public, self-resetting sales demo so it can be
-- excluded from expiry jobs, business stats, and identified for side-effect
-- guarding (no real SMS/WhatsApp/email/M-Pesa/IntaSend from that tenant).

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tenants_is_demo ON tenants(is_demo) WHERE is_demo = TRUE;
