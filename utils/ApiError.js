// ============================================================
// utils/ApiError.js — Custom error class for the API
// ============================================================
// JavaScript's built-in Error class doesn't have an HTTP status code.
// ApiError extends it to add one, so our error handler can send the
// correct HTTP status (400, 401, 404, etc.) in the response.
//
// "Operational errors" are expected problems like "user not found"
// or "invalid input" — not bugs in the code. Marking them with
// isOperational = true lets the error handler treat them differently
// from unexpected crashes.

export class ApiError extends Error {
  /**
   * @param {number} statusCode — HTTP status code (e.g. 400, 401, 404)
   * @param {string} message    — Human-readable error description
   */
  constructor(statusCode, message) {
    super(message);           // sets this.message via the parent Error class
    this.statusCode = statusCode;
    this.isOperational = true; // flag: this is an expected error, not a bug

    // Captures the call stack for better debugging in Node.js
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Convenience factory functions ─────────────────────────────────────────────
// Instead of writing `new ApiError(400, "...")` everywhere, controllers
// can call `badRequest("...")` which is shorter and more readable.

export const badRequest        = (message) => new ApiError(400, message); // invalid input
export const unauthorized      = (message) => new ApiError(401, message); // not logged in
export const forbidden         = (message) => new ApiError(403, message); // logged in but no permission
export const notFound          = (message) => new ApiError(404, message); // resource doesn't exist
export const conflict          = (message) => new ApiError(409, message); // duplicate resource
export const internalServerError = (message) => new ApiError(500, message); // unexpected server error
