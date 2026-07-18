/**
 * In-memory pointer to the single public demo tenant, set by
 * jobs/demoResetJob.js after it finds/creates that tenant row. Kept in
 * memory (rather than a DB lookup on every request) so the side-effect
 * guard in middleware/demoGuard.js is cheap enough to put on hot paths.
 */
let demoTenantId = null;

export function setDemoTenantId(id) {
  demoTenantId = id;
}

export function getDemoTenantId() {
  return demoTenantId;
}

export function isDemoTenant(tenantId) {
  return !!demoTenantId && !!tenantId && tenantId === demoTenantId;
}
