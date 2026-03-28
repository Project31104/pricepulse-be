// ============================================================
// config/rateLimiter.js — Request rate limiting configuration
// ============================================================
// Rate limiting prevents a single IP address from making too many
// requests in a short time. This protects the server from:
//   - Brute-force login attacks
//   - Scraping bots hammering the search endpoint
//   - Accidental infinite loops in client code
//
// Three tiers are defined here with different strictness levels.
// They are applied in app.js and productRoutes.js.

import rateLimit from 'express-rate-limit';

// ── Tier 1: General API limiter ───────────────────────────────────────────────
// Applied to ALL /api routes as a baseline safety net.
// Allows 100 requests per 15-minute window per IP address.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 100,                  // maximum requests per window
  standardHeaders: true,     // Send rate-limit info in response headers (RateLimit-*)
  legacyHeaders: false,      // Don't send the older X-RateLimit-* headers
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// ── Tier 2: Auth limiter ──────────────────────────────────────────────────────
// Applied only to login/register routes.
// Much stricter (20 attempts per 15 min) to block brute-force password attacks.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

// ── Tier 3: Search limiter ────────────────────────────────────────────────────
// Applied to the product search endpoint.
// 30 searches per minute is generous for a human but blocks automated scrapers.
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Search rate limit exceeded. Please slow down.' },
});
