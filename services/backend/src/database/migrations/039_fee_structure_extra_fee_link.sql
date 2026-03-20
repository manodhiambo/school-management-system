-- Link extra_fees to fee_structure so they appear in fee management
ALTER TABLE fee_structure
  ADD COLUMN IF NOT EXISTS extra_fee_id UUID REFERENCES extra_fees(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fee_structure_extra_fee_id ON fee_structure(extra_fee_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_route_id ON fee_structure(route_id);
