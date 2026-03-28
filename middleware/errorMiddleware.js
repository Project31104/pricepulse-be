// ============================================================
// middleware/errorMiddleware.js — Centralised error handler
// ============================================================
// In Express, any middleware with FOUR parameters (err, req, res, next)
// is treated as an error handler. It must be registered LAST in app.js
// so it catches errors forwarded by all other middleware and controllers.
//
// How it works:
//   - Controllers call next(error) when something goes wrong
//   - Express skips all normal middleware and jumps straight here
//   - This function decides what HTTP status and message to send back
//
// This single file handles ALL error types so the response format
// is always consistent: { success: false, message: "..." }

import { ApiError } from '../utils/ApiError.js';

// eslint-disable-next-line no-unused-vars — `next` is required by Express signature
const errorMiddleware = (err, req, res, next) => {

  // ── Logging ────────────────────────────────────────────────────────────────
  // In development, log the full error stack so developers can debug quickly.
  // In production, log only the status code and message to avoid noise.
  if (process.env.NODE_ENV !== 'production') {
    console.error(`❌ [${req.method}] ${req.originalUrl} →`, err);
  } else {
    console.error(`❌ ${err.statusCode || 500} ${err.message}`);
  }

  // ── Known operational error ────────────────────────────────────────────────
  // ApiError is our custom class (see utils/ApiError.js).
  // These are expected errors like "not found" or "bad request" —
  // not bugs, just invalid user input or missing resources.
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // ── Mongoose validation error ──────────────────────────────────────────────
  // Thrown when a document fails schema validation (e.g. missing required field).
  // We collect all validation messages and join them into one readable string.
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // ── Mongoose duplicate key error ───────────────────────────────────────────
  // Error code 11000 means a unique index was violated (e.g. registering
  // with an email address that already exists in the database).
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]; // e.g. "email"
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  // ── JWT errors ─────────────────────────────────────────────────────────────
  // JsonWebTokenError: token is malformed or has an invalid signature
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  // TokenExpiredError: token was valid but has passed its expiry time
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // ── Fallback: unknown / unexpected error ───────────────────────────────────
  // In production, hide internal details from the client for security.
  // In development, show the real error message to help with debugging.
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json({ success: false, message });
};

export default errorMiddleware;
