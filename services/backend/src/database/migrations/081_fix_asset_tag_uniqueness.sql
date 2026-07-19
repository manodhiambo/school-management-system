-- Migration 081: Fix proc_assets.asset_tag to be unique per-tenant, not globally
-- Same bug class as migration 027 (students.admission_number), 074
-- (subjects.code), and 078 (proc_purchase_requisitions.pr_number) -- the
-- global UNIQUE constraint meant a second tenant could never create even
-- their very first asset (AST-000001), since procurement's nextSeq() helper
-- only counts rows scoped to the current tenant while the constraint was
-- global. Discovered live while testing Maintenance Management's asset-link
-- feature (2026-07-19): creating a Procurement asset for a tenant that
-- already had zero assets still failed with a duplicate-key error, because
-- another tenant already held AST-000001. Same fix pattern, safe to apply.
--
-- The other 4 flagged proc_* columns (rfq_number, po_number, contract_number,
-- grn_number, payment_voucher_number) still have the identical bug and are
-- NOT fixed here -- nothing in this slice creates rows in those tables.

ALTER TABLE proc_assets DROP CONSTRAINT IF EXISTS proc_assets_asset_tag_key;

ALTER TABLE proc_assets ADD CONSTRAINT proc_assets_asset_tag_tenant_unique
  UNIQUE (tenant_id, asset_tag);
