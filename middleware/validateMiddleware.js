// ============================================================
// middleware/validateMiddleware.js — Input validation
// ============================================================
// Each function here is an Express middleware that validates the
// incoming request data BEFORE it reaches the controller.
//
// If the data is invalid, it calls next(badRequest(...)) which
// jumps straight to the error handler and returns a 400 response.
// If the data is valid, it calls next() to continue normally.
//
// This keeps validation logic out of controllers and makes it
// easy to reuse the same checks across multiple routes.

import { badRequest } from '../utils/ApiError.js';

// ── validateSearch ────────────────────────────────────────────────────────────
// Validates the search query parameter for GET /api/products/search?q=...
// Rules: must be present, a string, and at least 2 characters long.
// Also trims whitespace so "  iphone  " becomes "iphone".
export const validateSearch = (req, res, next) => {
  const { q } = req.query;

  // Reject if q is missing, not a string, or only whitespace
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return next(badRequest('Query parameter "q" is required'));
  }

  // Reject very short queries that would return meaningless results
  if (q.trim().length < 2) {
    return next(badRequest('Search query must be at least 2 characters'));
  }

  // Clean up the query before passing it to the controller
  req.query.q = q.trim();
  next();
};

// ── validateRegister ──────────────────────────────────────────────────────────
// Validates the request body for POST /api/auth/register.
// Collects ALL errors at once so the user sees everything wrong in one response.
export const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  // Name must be at least 2 characters
  if (!name || name.trim().length < 2)
    errors.push('Name must be at least 2 characters');

  // Basic email format check using a regular expression
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('Valid email is required');

  // Password must be at least 6 characters
  if (!password || password.length < 6)
    errors.push('Password must be at least 6 characters');

  // If any errors were collected, return them all joined into one message
  if (errors.length) return next(badRequest(errors.join('. ')));
  next();
};

// ── validateLogin ─────────────────────────────────────────────────────────────
// Validates the request body for POST /api/auth/login.
// Just checks that both fields are present — the controller handles
// the actual credential check against the database.
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(badRequest('Email and password are required'));
  }
  next();
};

// ── validateCompareLink ───────────────────────────────────────────────────────
// Validates the request body for POST /api/products/compare-link.
// Checks that a URL was provided and that it is a syntactically valid URL.
// The controller does the deeper check (is it a supported platform?).
export const validateCompareLink = (req, res, next) => {
  const { url } = req.body;

  // Reject if url is missing or empty
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return next(badRequest('A product URL is required'));
  }

  // Use the built-in URL constructor to check basic URL syntax.
  // It throws a TypeError if the string is not a valid URL.
  try {
    new URL(url.trim());
  } catch {
    return next(badRequest('Please provide a valid URL (must start with http:// or https://)'));
  }

  // Store the trimmed URL back so the controller gets a clean value
  req.body.url = url.trim();
  next();
};
