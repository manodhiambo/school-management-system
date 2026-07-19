-- Migration 076: Asset issuance (per-unit tracking + issue/return/liability)
-- Extends the existing generic inventory module (inventory_categories/items/
-- transactions from migration 057) with a layer for individually-trackable
-- physical units (a specific locker, mattress, bed — as opposed to bulk
-- consumable stock like exercise books, which keeps using the existing
-- aggregate inventory_items.quantity). Deliberately generic ("issued to a
-- person") rather than hostel-specific, so it's reusable later for
-- staff-issued equipment, not just boarding.

CREATE TABLE IF NOT EXISTS inventory_item_units (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id            UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  barcode            VARCHAR(60),
  qr_code            VARCHAR(60),
  serial_number      VARCHAR(100),
  condition          VARCHAR(30) DEFAULT 'good' CHECK (condition IN ('new','good','fair','poor','damaged','lost')),
  current_holder_type VARCHAR(20) DEFAULT 'none' CHECK (current_holder_type IN ('none','student','staff')),
  current_holder_id  UUID,
  purchase_date      DATE,
  purchase_cost      NUMERIC(10,2) DEFAULT 0,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, barcode)
);
CREATE INDEX IF NOT EXISTS idx_inv_units_tenant ON inventory_item_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_units_item   ON inventory_item_units(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_units_holder ON inventory_item_units(current_holder_type, current_holder_id);

CREATE TABLE IF NOT EXISTS inventory_issuances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_unit_id        UUID NOT NULL REFERENCES inventory_item_units(id) ON DELETE CASCADE,
  student_id          UUID REFERENCES students(id) ON DELETE CASCADE,
  issued_at           TIMESTAMPTZ DEFAULT NOW(),
  issued_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  returned_at         TIMESTAMPTZ,
  condition_at_issue  VARCHAR(30),
  condition_at_return VARCHAR(30),
  status              VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued','returned','lost','damaged')),
  replacement_cost    NUMERIC(10,2) DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_issuances_tenant  ON inventory_issuances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_issuances_unit    ON inventory_issuances(item_unit_id);
CREATE INDEX IF NOT EXISTS idx_inv_issuances_student ON inventory_issuances(student_id);
CREATE INDEX IF NOT EXISTS idx_inv_issuances_status  ON inventory_issuances(status);
