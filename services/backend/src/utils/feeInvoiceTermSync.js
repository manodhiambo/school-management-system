import { query } from '../config/database.js';

// Keeps already-issued invoices in sync when a fee_structure's own term
// changes (e.g. an admin corrects an extra fee from "All Terms" to a
// specific term). Without this, an invoice generated back when the
// structure's term was NULL/different keeps its old term forever, so the
// duplicate-invoice check (student + fee_structure_id + term + year) no
// longer recognizes it as the same fee the next time invoices are
// generated for the structure's new term -- silently creating a second,
// duplicate bill for a fee that was already invoiced (this is exactly how
// the GOA "TISSUE FUNDS" duplicate-invoice incident of 2026-07-28 happened).
//
// Only backfills an invoice's term when doing so is provably safe: it
// skips any invoice whose student already has ANOTHER non-cancelled
// invoice on this same structure with the target term, since forcing that
// match would itself create a same-key collision instead of preventing one.
export async function syncInvoiceTermsToStructure(tenantId, feeStructureId, newTerm) {
  await query(
    `UPDATE fee_invoices fi
     SET term = $1, updated_at = NOW()
     WHERE fi.fee_structure_id = $2 AND fi.tenant_id = $3
       AND fi.status != 'cancelled'
       AND fi.term IS DISTINCT FROM $1
       AND NOT EXISTS (
         SELECT 1 FROM fee_invoices fi2
         WHERE fi2.id != fi.id AND fi2.student_id = fi.student_id
           AND fi2.fee_structure_id = $2 AND fi2.tenant_id = $3
           AND fi2.status != 'cancelled'
           AND ($1::text IS NULL OR fi2.term = $1)
       )`,
    [newTerm || null, feeStructureId, tenantId]
  );
}
