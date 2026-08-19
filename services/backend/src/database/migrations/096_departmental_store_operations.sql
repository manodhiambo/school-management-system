-- Migration 096: Department-based procurement & store operations
--
-- Closes gaps in the procurement/inventory modules for real school operations:
--   1. Purchase Orders now record which department they're for (carried from
--      the originating Purchase Requisition, or set directly on direct POs).
--   2. Goods Receipt (GRN) items can be traced to the inventory item they
--      stocked into central store (see procurementRoutes.js GRN handler).
--   3. New: Store Requisitions — a department asks for stock that already
--      exists in the central store (distinct from Purchase Requisitions,
--      which buy new stock from a supplier).
--   4. New: Store Issues — the actual movement of stock out of the central
--      store to a specific department, with a signature (received_by/
--      received_at) captured from whoever at the receiving department
--      confirms the delivery. This is what makes stock movement between
--      departments auditable end-to-end: request -> approve -> issue
--      (quantity leaves the store, low-stock check fires) -> receive (signed).
--
-- Department is deliberately kept as a plain string (matching the existing
-- proc_purchase_requisitions.department / proc_budgets.department columns)
-- rather than a new departments table — approval/issuing authority is
-- role-based (admin/finance_officer), not a per-department assignee.

ALTER TABLE proc_purchase_orders ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE proc_grn_items ADD COLUMN IF NOT EXISTS matched_inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL;

-- ── Store Requisitions (department asks for stock already in the store) ─────
CREATE TABLE IF NOT EXISTS store_requisitions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requisition_number VARCHAR(30),
  department         VARCHAR(100) NOT NULL,
  requested_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  required_date      DATE,
  urgency            VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','emergency')),
  reason             TEXT,
  status             VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
                        'draft','submitted','approved','rejected','partially_issued','issued','cancelled'
                      )),
  approved_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at        TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, requisition_number)
);
CREATE INDEX IF NOT EXISTS idx_store_req_tenant     ON store_requisitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_req_status     ON store_requisitions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_store_req_department ON store_requisitions(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_store_req_requester  ON store_requisitions(requested_by);

CREATE TABLE IF NOT EXISTS store_requisition_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requisition_id     UUID NOT NULL REFERENCES store_requisitions(id) ON DELETE CASCADE,
  item_id            UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_requested NUMERIC(10,2) NOT NULL,
  quantity_issued    NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_req_items_tenant ON store_requisition_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_req_items_req    ON store_requisition_items(requisition_id);

-- ── Store Issues (stock actually leaving the store for a department) ────────
CREATE TABLE IF NOT EXISTS store_issues (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  issue_number          VARCHAR(30),
  requisition_id        UUID REFERENCES store_requisitions(id) ON DELETE SET NULL,
  item_id               UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity              NUMERIC(10,2) NOT NULL,
  from_location         VARCHAR(150) NOT NULL DEFAULT 'Central Store',
  to_department          VARCHAR(100) NOT NULL,
  issued_by             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at             TIMESTAMPTZ DEFAULT NOW(),
  received_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  received_at           TIMESTAMPTZ,
  condition_on_receipt  VARCHAR(20) CHECK (condition_on_receipt IN ('good','damaged','short')),
  status                VARCHAR(20) NOT NULL DEFAULT 'pending_receipt' CHECK (status IN ('pending_receipt','received','disputed')),
  notes                 TEXT,
  inventory_transaction_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, issue_number)
);
CREATE INDEX IF NOT EXISTS idx_store_issues_tenant ON store_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_issues_status ON store_issues(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_store_issues_dept   ON store_issues(tenant_id, to_department);
CREATE INDEX IF NOT EXISTS idx_store_issues_req    ON store_issues(requisition_id);
