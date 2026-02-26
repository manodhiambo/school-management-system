-- Migration 023: Backfill users.tenant_id and library_books.tenant_id
-- Safe to re-run: all UPDATEs guard with WHERE tenant_id IS NULL
--
-- Problem 1: users.tenant_id is NULL for users created before migration 018
--   added the column. These users are invisible in User Management which
--   filters WHERE u.tenant_id = $1, but their student/teacher/parent rows
--   already have tenant_id set (backfilled by 019/020/021).
--
-- Problem 2: library_books.tenant_id is NULL because migration 020 added
--   the column but provided no backfill query for the books table.

-- ============================================================
-- STEP 1: Backfill users.tenant_id via students
-- ============================================================
UPDATE users u SET tenant_id = s.tenant_id
  FROM students s
  WHERE u.id = s.user_id
    AND u.tenant_id IS NULL
    AND s.tenant_id IS NOT NULL;

-- ============================================================
-- STEP 2: Backfill users.tenant_id via teachers
-- ============================================================
UPDATE users u SET tenant_id = t.tenant_id
  FROM teachers t
  WHERE u.id = t.user_id
    AND u.tenant_id IS NULL
    AND t.tenant_id IS NOT NULL;

-- ============================================================
-- STEP 3: Backfill users.tenant_id via parents
-- ============================================================
UPDATE users u SET tenant_id = p.tenant_id
  FROM parents p
  WHERE u.id = p.user_id
    AND u.tenant_id IS NULL
    AND p.tenant_id IS NOT NULL;

-- ============================================================
-- STEP 4: Remaining users with NULL tenant_id (admins, finance_officers, etc.
--   that have no student/teacher/parent profile) → oldest active/trial tenant
-- ============================================================
UPDATE users SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
)
WHERE tenant_id IS NULL
  AND role != 'superadmin';

-- ============================================================
-- STEP 5: Backfill library_books.tenant_id
--   Books have no created_by or profile join, assign to oldest active tenant.
-- ============================================================
UPDATE library_books SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
)
WHERE tenant_id IS NULL;
