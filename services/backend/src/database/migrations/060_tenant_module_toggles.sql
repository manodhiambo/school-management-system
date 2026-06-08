-- Allow superadmins to disable specific feature modules per tenant.
-- Module keys are app-defined (see src/config/moduleRegistry.js).
-- An empty array means every module is enabled for the tenant.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS disabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb;
