// utils/ApiError.js
// Custom error class for operational errors (not programming bugs).
// Provides consistent error format across the API.

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Convenience functions for common HTTP status codes
export const badRequest = (message) => new ApiError(400, message);
export const unauthorized = (message) => new ApiError(401, message);
export const forbidden = (message) => new ApiError(403, message);
export const notFound = (message) => new ApiError(404, message);
export const conflict = (message) => new ApiError(409, message);
export const internalServerError = (message) => new ApiError(500, message);