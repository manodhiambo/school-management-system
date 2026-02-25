-- Migration 020: Complete tenant isolation — add tenant_id to all remaining tables
-- Safe to re-run: uses IF NOT EXISTS

-- ============================================================
-- SETTINGS & ACADEMIC YEARS
-- ============================================================
ALTER TABLE settings       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================
-- MESSAGING / COMMUNICATION
-- ============================================================
ALTER TABLE messages      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- parent_teacher_meetings (PTM)
ALTER TABLE parent_teacher_meetings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================
-- EXAM RESULTS / ONLINE EXAM TABLES
-- ============================================================
ALTER TABLE exam_results         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE exam_questions        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE exam_attempts         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE exam_attempt_answers  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================
-- FINANCE MODULE
-- ============================================================
ALTER TABLE financial_years   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE income_records     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE expense_records    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE vendors            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE bank_accounts      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE bank_transactions  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE petty_cash         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE assets             ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE finance_settings   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================
-- BUDGET MODULE
-- ============================================================
ALTER TABLE budgets      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
ALTER TABLE purchase_orders      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================
-- LIBRARY MODULE
-- ============================================================
ALTER TABLE library_books      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE library_members    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE library_borrowings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE library_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================
-- POPULATE tenant_id FROM EXISTING JOINED DATA
-- ============================================================

-- exam_results → via exams.tenant_id
UPDATE exam_results er SET tenant_id = e.tenant_id
  FROM exams e WHERE er.exam_id = e.id AND er.tenant_id IS NULL AND e.tenant_id IS NOT NULL;

-- exam_questions → via exams.tenant_id
UPDATE exam_questions eq SET tenant_id = e.tenant_id
  FROM exams e WHERE eq.exam_id = e.id AND eq.tenant_id IS NULL AND e.tenant_id IS NOT NULL;

-- exam_attempts → via exams.tenant_id
UPDATE exam_attempts ea SET tenant_id = e.tenant_id
  FROM exams e WHERE ea.exam_id = e.id AND ea.tenant_id IS NULL AND e.tenant_id IS NOT NULL;

-- exam_attempt_answers → via exam_attempts.tenant_id
UPDATE exam_attempt_answers eaa SET tenant_id = ea.tenant_id
  FROM exam_attempts ea WHERE eaa.attempt_id = ea.id AND eaa.tenant_id IS NULL AND ea.tenant_id IS NOT NULL;

-- messages → via sender users.tenant_id
UPDATE messages m SET tenant_id = u.tenant_id
  FROM users u WHERE m.sender_id = u.id AND m.tenant_id IS NULL AND u.tenant_id IS NOT NULL;

-- announcements → via created_by user
UPDATE announcements a SET tenant_id = u.tenant_id
  FROM users u WHERE a.created_by = u.id AND a.tenant_id IS NULL AND u.tenant_id IS NOT NULL;

-- library_members → via students or teachers
UPDATE library_members lm SET tenant_id = s.tenant_id
  FROM students s WHERE lm.student_id = s.id AND lm.tenant_id IS NULL AND s.tenant_id IS NOT NULL;
UPDATE library_members lm SET tenant_id = t.tenant_id
  FROM teachers t WHERE lm.teacher_id = t.id AND lm.tenant_id IS NULL AND t.tenant_id IS NOT NULL;

-- library_borrowings → via library_members
UPDATE library_borrowings lb SET tenant_id = lm.tenant_id
  FROM library_members lm WHERE lb.member_id = lm.id AND lb.tenant_id IS NULL AND lm.tenant_id IS NOT NULL;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id         ON settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_tenant_id   ON academic_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id         ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_tenant_id     ON exam_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_tenant_id   ON exam_questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_tenant_id    ON exam_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_income_records_tenant_id   ON income_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_tenant_id  ON expense_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_years_tenant_id  ON financial_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant_id    ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant_id          ON budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id  ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_library_books_tenant_id    ON library_books(tenant_id);
CREATE INDEX IF NOT EXISTS idx_library_members_tenant_id  ON library_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_library_borrowings_tenant_id ON library_borrowings(tenant_id);
