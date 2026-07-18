import { isDemoTenant } from '../services/demoTenant.js';

/**
 * Blocks a specific route from ever reaching a real external provider
 * (SMS/WhatsApp/email/M-Pesa/IntaSend) when it's being called by the public
 * demo tenant. The demo login is unauthenticated-to-reach (one click from the
 * landing page), so anything that sends a real message to an attacker-chosen
 * phone/email or prompts a real payment has to be short-circuited here —
 * unlike ordinary demo data, a sent SMS/email/payment prompt can't be undone
 * by the nightly reset.
 *
 * Place this middleware directly before the route handler, after
 * `authenticate`/`tenantContext` have run.
 */
export function blockDemoSideEffects(label) {
  return (req, res, next) => {
    const tenantId = req.tenantId || req.user?.tenant_id;
    if (isDemoTenant(tenantId)) {
      return res.json({
        success: true,
        simulated: true,
        message: `This is the live demo account — ${label} is simulated here. No real message was sent and nothing was charged.`,
      });
    }
    next();
  };
}
