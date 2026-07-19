-- Migration 078: Fix proc_purchase_requisitions.pr_number to be unique per-tenant, not globally
-- Mirrors migration 027 (students.admission_number) and migration 074 (subjects.code) —
-- the global UNIQUE constraint meant two different schools could both never independently
-- start their PR numbering at PR-000001, colliding the moment any two tenants' per-tenant
-- counts lined up. Discovered live while testing Kitchen Requisitions (2026-07-19): a
-- brand-new tenant's very first PR (count-based next-number = PR-000001) collided with an
-- existing PR-000001 already used by a different tenant, since procurement's own nextSeq()
-- helper only counts rows scoped to the current tenant while the constraint was global.
-- Safe to apply: any existing data that already satisfies global uniqueness automatically
-- satisfies the weaker per-tenant version.

ALTER TABLE proc_purchase_requisitions DROP CONSTRAINT IF EXISTS proc_purchase_requisitions_pr_number_key;

ALTER TABLE proc_purchase_requisitions ADD CONSTRAINT proc_purchase_requisitions_pr_number_tenant_unique
  UNIQUE (tenant_id, pr_number);
