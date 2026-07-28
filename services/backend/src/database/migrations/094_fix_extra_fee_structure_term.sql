-- Migration 094: Fix extra-fee-linked fee_structure.term
-- The extra_fees create/update routes never copied the extra fee's own
-- `term` onto its auto-created/synced fee_structure row, so that structure's
-- term was always NULL ("all terms") to the invoice-generation matching
-- logic (`fs.term IS NULL OR fs.term = $selected_term`) -- a Term-2-only
-- extra fee would get invoiced even when generating Term 1 or Term 3
-- invoices. This backfills the 18 existing mismatched rows; the route code
-- fix (extraFeesRoutes.js) prevents new ones from drifting.
--
-- CAUTION for future migration authors: this repo's migration runner splits
-- each file on every literal semicolon character, including ones inside
-- double-dash comments. Do not use semicolons in prose within comments here.

UPDATE fee_structure fs
SET term = ef.term, updated_at = NOW()
FROM extra_fees ef
WHERE fs.extra_fee_id = ef.id
  AND fs.term IS DISTINCT FROM ef.term;
