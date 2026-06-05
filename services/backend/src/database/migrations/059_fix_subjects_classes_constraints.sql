-- Migration 059: Fix subjects & classes constraints for multi-tenant seeding
-- The old MySQL subjects table had a global UNIQUE on code; replace with per-tenant unique.
-- Also add UUID default to subjects.id and classes.id so inserts don't require explicit ids.

-- ── subjects ────────────────────────────────────────────────
-- Drop the old global unique constraint on code (if it still exists)
DO $$
BEGIN
  -- Try to drop any constraint named subjects_code_key (PostgreSQL default name)
  ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_code_key;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop any index called idx_code or subjects_code_idx
DROP INDEX IF EXISTS idx_code;
DROP INDEX IF EXISTS subjects_code_idx;

-- Add per-tenant unique constraint on (tenant_id, code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subjects'
      AND constraint_name = 'subjects_tenant_code_unique'
  ) THEN
    ALTER TABLE subjects ADD CONSTRAINT subjects_tenant_code_unique UNIQUE (tenant_id, code);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add UUID default to subjects.id so inserts without explicit id work
DO $$
BEGIN
  -- Only alter if the column default is not already set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'id' AND column_default IS NOT NULL
  ) THEN
    -- Change column type to UUID and add default (only if currently VARCHAR)
    BEGIN
      ALTER TABLE subjects ALTER COLUMN id SET DEFAULT gen_random_uuid();
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ── classes ─────────────────────────────────────────────────
-- Drop old global unique constraint on (name, section, academic_year) without tenant_id
DO $$
BEGIN
  ALTER TABLE classes DROP CONSTRAINT IF EXISTS unique_class_section_year;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add per-tenant unique on (tenant_id, name, section)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'classes'
      AND constraint_name = 'classes_tenant_name_section_unique'
  ) THEN
    ALTER TABLE classes ADD CONSTRAINT classes_tenant_name_section_unique UNIQUE (tenant_id, name, section);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add UUID default to classes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'id' AND column_default IS NOT NULL
  ) THEN
    BEGIN
      ALTER TABLE classes ALTER COLUMN id SET DEFAULT gen_random_uuid();
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
