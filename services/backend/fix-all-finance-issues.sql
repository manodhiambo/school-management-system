-- Fix 1: Check financial_years columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'financial_years';

-- Fix 2: Check assets columns  
SELECT column_name FROM information_schema.columns WHERE table_name = 'assets';

-- Fix 3: Add missing columns if needed
ALTER TABLE assets ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_name VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(15,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS current_value NUMERIC(15,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_by UUID;

-- Verify
SELECT * FROM assets LIMIT 1;
