-- Migration 092: Journal Entries tenant isolation
-- journal_entries/journal_entry_lines were created (migration 014) with no
-- tenant_id at all -- unlike chart_of_accounts, which migrations 020/021
-- already fixed the same way. Every Advanced Reports query against these
-- two tables (Journals list, Journal detail, General Ledger journal lines)
-- currently mixes every tenant's entries together with zero isolation.
-- entry_number also had a GLOBAL unique constraint, which would collide the
-- moment two tenants' first journal entries both land on e.g. JNL-00001
-- once numbering is scoped per tenant in application code.
--
-- CAUTION for future migration authors: this repo's migration runner splits
-- each file on every literal semicolon character, including ones inside
-- double-dash comments. Do not use semicolons in prose within comments here.

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Defensive backfill -- 0 rows exist in production today, so this is a
-- no-op safety net rather than an active data migration.
UPDATE journal_entries je SET tenant_id = u.tenant_id
FROM users u
WHERE je.created_by = u.id AND je.tenant_id IS NULL AND u.tenant_id IS NOT NULL;

UPDATE journal_entry_lines jel SET tenant_id = je.tenant_id
FROM journal_entries je
WHERE jel.journal_entry_id = je.id AND jel.tenant_id IS NULL AND je.tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_tenant ON journal_entry_lines(tenant_id);

ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_entry_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_tenant_entry_number
  ON journal_entries (tenant_id, entry_number);
