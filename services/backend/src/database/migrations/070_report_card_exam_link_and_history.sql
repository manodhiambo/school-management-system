-- Migration 070: Let a CBC report card be tied to a specific exam (so it can print that
-- exam's actual results), and track report card generation batch history.

-- 1. Optional link from a report card to a specific exam record (e.g. "Mid Term Exam",
--    "CAT 1") created in the Exams module. When set, the report card pulls scores from
--    exam_results for that exam instead of the whole-term CBC assessment aggregate.
ALTER TABLE cbc_report_cards
  ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id) ON DELETE SET NULL;

-- 2. Report card generation batch history — one row per "Generate Report Cards" run,
--    so admins can see what was generated, when, by whom, and for which class/term/period,
--    instead of only being able to see the current live cbc_report_cards rows.
CREATE TABLE IF NOT EXISTS cbc_report_card_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  term VARCHAR(10) NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  period VARCHAR(50),
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  total_students INTEGER NOT NULL DEFAULT 0,
  cards_created INTEGER NOT NULL DEFAULT 0,
  cards_updated INTEGER NOT NULL DEFAULT 0,
  generated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_card_batches_tenant ON cbc_report_card_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_card_batches_class ON cbc_report_card_batches(class_id);
