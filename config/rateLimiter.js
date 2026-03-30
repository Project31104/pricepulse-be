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

const limiterOptions = (max, windowMs, message) => ({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  // Required for Vercel — trust the X-Forwarded-For header
  keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown',
  skip: () => process.env.NODE_ENV === 'production' && !process.env.ENABLE_RATE_LIMIT,
  message: { success: false, message },
});

export const generalLimiter = rateLimit(limiterOptions(
  100, 15 * 60 * 1000, 'Too many requests, please try again later.'
));

export const authLimiter = rateLimit(limiterOptions(
  20, 15 * 60 * 1000, 'Too many auth attempts, please try again in 15 minutes.'
));

export const searchLimiter = rateLimit(limiterOptions(
  30, 60 * 1000, 'Search rate limit exceeded. Please slow down.'
));
