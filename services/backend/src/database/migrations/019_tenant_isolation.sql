-- Migration 019: Add tenant_id to tables missing it for full isolation
-- Safe to re-run: uses IF NOT EXISTS / WHERE tenant_id IS NULL

ALTER TABLE attendance   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE fee_structure ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE fee_invoices  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE fee_payments  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Populate from existing data via joins
UPDATE attendance a SET tenant_id = s.tenant_id
  FROM students s WHERE a.student_id = s.id AND a.tenant_id IS NULL AND s.tenant_id IS NOT NULL;

UPDATE fee_invoices fi SET tenant_id = s.tenant_id
  FROM students s WHERE fi.student_id = s.id AND fi.tenant_id IS NULL AND s.tenant_id IS NOT NULL;

UPDATE fee_payments fp SET tenant_id = fi.tenant_id
  FROM fee_invoices fi WHERE fp.invoice_id = fi.id AND fp.tenant_id IS NULL AND fi.tenant_id IS NOT NULL;

UPDATE fee_payments fp SET tenant_id = s.tenant_id
  FROM students s WHERE fp.student_id = s.id AND fp.tenant_id IS NULL AND s.tenant_id IS NOT NULL;

UPDATE fee_structure fs SET tenant_id = c.tenant_id
  FROM classes c WHERE fs.class_id = c.id AND fs.tenant_id IS NULL AND c.tenant_id IS NOT NULL;

-- For fee_structure rows with no class (school-wide), link to the oldest tenant
UPDATE fee_structure SET tenant_id = (SELECT id FROM tenants ORDER BY created_at LIMIT 1)
  WHERE tenant_id IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id   ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_tenant_id ON fee_structure(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_tenant_id  ON fee_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_tenant_id  ON fee_payments(tenant_id);
