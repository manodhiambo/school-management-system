import rateLimit from 'express-rate-limit';

// General API rate limiter — 100 req / 15 min per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints (login, refresh, 2FA) — 10 attempts / 15 min per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Password reset / forgot password — 5 requests / hour per IP
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset requests, please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration — 3 registrations / hour per IP to prevent abuse
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many registration attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public inbound webhooks (SMS/M-Pesa) — 60 req / min per IP, generous for a
// legitimate provider but enough to blunt abuse of an unauthenticated endpoint
export const inboundWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export default { apiLimiter, authLimiter, passwordResetLimiter, registrationLimiter, inboundWebhookLimiter };
