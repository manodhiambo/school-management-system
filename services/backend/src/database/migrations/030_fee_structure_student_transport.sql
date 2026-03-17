-- Migration 030: Fee Structure ↔ Student Type & Transport Integration
-- Adds student_type, is_transport_fee, route_id to fee_structure
-- Adds fare_per_km, distance_km to transport_routes

-- 1. Fee structure student type (boarder / day_scholar / all)
ALTER TABLE fee_structure
  ADD COLUMN IF NOT EXISTS student_type VARCHAR(20) DEFAULT 'all'
  CHECK (student_type IN ('all', 'boarder', 'day_scholar'));

-- 2. Transport fee flag
ALTER TABLE fee_structure
  ADD COLUMN IF NOT EXISTS is_transport_fee BOOLEAN DEFAULT FALSE;

-- 3. Optional route link (transport fee specific to one route)
ALTER TABLE fee_structure
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES transport_routes(id) ON DELETE SET NULL;

-- 4. Distance-based pricing on transport routes
ALTER TABLE transport_routes
  ADD COLUMN IF NOT EXISTS fare_per_km NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,2) DEFAULT 0;

-- 5. Index for faster student-type filtering
CREATE INDEX IF NOT EXISTS idx_fee_structure_student_type ON fee_structure(student_type);
CREATE INDEX IF NOT EXISTS idx_fee_structure_transport ON fee_structure(is_transport_fee);
