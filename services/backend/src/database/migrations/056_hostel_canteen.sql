-- Migration 056: Hostel Full Management + Canteen

-- Hostel rooms
CREATE TABLE IF NOT EXISTS hostel_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hostel_id   UUID REFERENCES hostels(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  capacity    INT DEFAULT 4,
  room_type   VARCHAR(30) DEFAULT 'dormitory' CHECK (room_type IN ('dormitory','private','semi-private')),
  floor       VARCHAR(20),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hostel_rooms_tenant ON hostel_rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_hostel ON hostel_rooms(hostel_id);

-- Room allocations (link student → room)
CREATE TABLE IF NOT EXISTS hostel_allocations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id      UUID NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  bed_number   INT,
  check_in     DATE NOT NULL DEFAULT CURRENT_DATE,
  check_out    DATE,
  is_active    BOOLEAN DEFAULT TRUE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, student_id, check_in)
);

CREATE INDEX IF NOT EXISTS idx_hostel_alloc_tenant  ON hostel_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_student ON hostel_allocations(student_id);

-- Hostel movements (departure/return)
CREATE TABLE IF NOT EXISTS hostel_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) CHECK (movement_type IN ('departure','return','exeat','overnight')),
  departure_at  TIMESTAMPTZ,
  return_at     TIMESTAMPTZ,
  reason        TEXT,
  approved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  guardian_name VARCHAR(150),
  guardian_phone VARCHAR(30),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','returned','overdue')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hostel_movements_tenant  ON hostel_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hostel_movements_student ON hostel_movements(student_id);

-- Canteen meal plans
CREATE TABLE IF NOT EXISTS canteen_meal_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  meal_type   VARCHAR(30) CHECK (meal_type IN ('breakfast','lunch','supper','snack','full_day')),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Student canteen balance
CREATE TABLE IF NOT EXISTS canteen_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  balance     NUMERIC(12,2) DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, student_id)
);

-- Canteen transactions (top-up or meal purchase)
CREATE TABLE IF NOT EXISTS canteen_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  type         VARCHAR(20) CHECK (type IN ('topup','debit','refund')),
  meal_plan_id UUID REFERENCES canteen_meal_plans(id) ON DELETE SET NULL,
  reference    VARCHAR(100),
  notes        TEXT,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canteen_accounts_tenant  ON canteen_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_canteen_accounts_student ON canteen_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_canteen_txn_tenant       ON canteen_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_canteen_txn_student      ON canteen_transactions(student_id);

-- Canteen stock
CREATE TABLE IF NOT EXISTS canteen_stock (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_name   VARCHAR(150) NOT NULL,
  unit        VARCHAR(30) DEFAULT 'units',
  quantity    NUMERIC(10,2) DEFAULT 0,
  reorder_level NUMERIC(10,2) DEFAULT 10,
  unit_cost   NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canteen_stock_tenant ON canteen_stock(tenant_id);
