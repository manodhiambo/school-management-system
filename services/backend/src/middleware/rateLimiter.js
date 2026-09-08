import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Key by the authenticated user (decoded from the JWT) when present, falling back to IP
// for unauthenticated requests. This matters because a single logged-in SPA tab already
// generates a steady stream of background polling (unread counts, message checks, the
// trial banner) — keying purely by IP means every user behind the same NAT/public IP (e.g.
// a whole school on one router) shares one budget and starves each other out. Keying by
// user makes the budget per-person instead, which is what was actually intended.
function requestKey(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret);
      if (decoded?.userId) return `user:${decoded.userId}`;
    } catch { /* invalid/expired token — fall back to IP-based limiting below */ }
  }
  return req.ip;
}

// General API rate limiter — 300 req / 15 min per user (or per IP if unauthenticated).
// Raised from 100: the SPA's own idle background polling (unread-message poll every 15s,
// notification poll every 30s) alone adds up to ~90 req/15min per logged-in tab before the
// user does anything, so 100 was already exhausted by normal use — see
// SoundNotificationProvider.tsx / Header.tsx.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: requestKey,
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
