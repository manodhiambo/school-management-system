-- Migration 077: Kitchen & Feeding expansion
-- Extends the existing canteen module (canteen_meal_plans/canteen_accounts/
-- canteen_transactions/canteen_stock from migration 056) rather than
-- duplicating it — adds batch/expiry/location tracking to stock, a proper
-- stock movement audit trail (the existing /stock/:id/adjust endpoint
-- silently overwrote quantity with no history), menu planning, and meal
-- attendance (distinct from the wallet debit — tracks who ate, not just
-- who paid). Diet/allergy data and suppliers/requisitions deliberately
-- reuse existing tables from other modules (student_medical_profile,
-- proc_suppliers, proc_purchase_requisitions) rather than duplicating them.

-- ── Stock: batch/expiry/category/location ───────────────────────────────────
ALTER TABLE canteen_stock ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL;
ALTER TABLE canteen_stock ADD COLUMN IF NOT EXISTS batch_number VARCHAR(60);
ALTER TABLE canteen_stock ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE canteen_stock ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(150);

-- ── Stock movement audit trail ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canteen_stock_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stock_id    UUID NOT NULL REFERENCES canteen_stock(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('received','used','wasted','adjustment')),
  quantity    NUMERIC(10,2) NOT NULL,
  reference   VARCHAR(150),
  notes       TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canteen_movements_tenant ON canteen_stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_canteen_movements_stock  ON canteen_stock_movements(stock_id);

-- ── Menu planning ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canteen_menus (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  menu_date        DATE NOT NULL,
  meal_type        VARCHAR(30) NOT NULL CHECK (meal_type IN ('breakfast','lunch','supper','snack','full_day')),
  meal_plan_id     UUID REFERENCES canteen_meal_plans(id) ON DELETE SET NULL,
  dish_name        VARCHAR(150),
  nutrition_notes  TEXT,
  notes            TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canteen_menus_tenant ON canteen_menus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_canteen_menus_date   ON canteen_menus(tenant_id, menu_date);

-- ── Meal attendance (who ate, distinct from who paid) ───────────────────────
CREATE TABLE IF NOT EXISTS canteen_meal_attendance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  menu_id          UUID REFERENCES canteen_menus(id) ON DELETE SET NULL,
  meal_plan_id     UUID REFERENCES canteen_meal_plans(id) ON DELETE SET NULL,
  attendance_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type        VARCHAR(30) NOT NULL CHECK (meal_type IN ('breakfast','lunch','supper','snack','full_day')),
  method           VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('qr','manual')),
  marked_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  marked_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, student_id, attendance_date, meal_type)
);
CREATE INDEX IF NOT EXISTS idx_canteen_attendance_tenant  ON canteen_meal_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_canteen_attendance_student ON canteen_meal_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_canteen_attendance_date    ON canteen_meal_attendance(tenant_id, attendance_date);
