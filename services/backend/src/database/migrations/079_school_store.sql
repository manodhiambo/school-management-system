-- Migration 079: School Store / POS
-- Genuinely new (no existing store/POS anywhere), but built on existing
-- infrastructure rather than duplicating it: products live in the existing
-- inventory_items/inventory_categories tables (already the base for Hostel
-- Inventory), and "Student Account Charging" reuses the existing Canteen
-- wallet (canteen_accounts/canteen_transactions) via a new nullable
-- store_sale_id column, rather than a second wallet system — one real-world
-- pocket-money balance spent on either food or store items.

-- ── Products: extend inventory_items with selling price + POS barcode ───────
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode VARCHAR(60);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS qr_code VARCHAR(60);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_store_item BOOLEAN DEFAULT FALSE;

-- ── Sales ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_sales (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_number             VARCHAR(30),
  student_id              UUID REFERENCES students(id) ON DELETE SET NULL,
  customer_name           VARCHAR(150),
  payment_method          VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash','mpesa','card','wallet')),
  subtotal                NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_tendered         NUMERIC(12,2),
  change_due              NUMERIC(12,2),
  status                  VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','refunded','partial_refund','pending_mpesa','cancelled')),
  mpesa_checkout_request_id VARCHAR(100),
  mpesa_reference         VARCHAR(100),
  cashier_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sale_number)
);
CREATE INDEX IF NOT EXISTS idx_store_sales_tenant  ON store_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_sales_student ON store_sales(student_id);

CREATE TABLE IF NOT EXISTS store_sale_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id            UUID NOT NULL REFERENCES store_sales(id) ON DELETE CASCADE,
  item_id            UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  item_name          VARCHAR(200) NOT NULL,
  quantity           NUMERIC(10,2) NOT NULL,
  unit_price         NUMERIC(10,2) NOT NULL,
  line_total         NUMERIC(12,2) NOT NULL,
  refunded_quantity  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_sale_items_tenant ON store_sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_sale_items_sale   ON store_sale_items(sale_id);

CREATE TABLE IF NOT EXISTS store_refunds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id       UUID NOT NULL REFERENCES store_sales(id) ON DELETE CASCADE,
  sale_item_id  UUID NOT NULL REFERENCES store_sale_items(id) ON DELETE CASCADE,
  quantity      NUMERIC(10,2) NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  reason        TEXT,
  refunded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_refunds_tenant ON store_refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_refunds_sale   ON store_refunds(sale_id);

-- ── Wallet sharing with Canteen ──────────────────────────────────────────────
ALTER TABLE canteen_transactions ADD COLUMN IF NOT EXISTS store_sale_id UUID REFERENCES store_sales(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_canteen_txn_store_sale ON canteen_transactions(store_sale_id);
