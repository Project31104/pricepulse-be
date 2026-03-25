// middleware/errorMiddleware.js
// Centralised error handler — must be registered LAST in app.js.
// All controllers call next(error) and this middleware formats the response.

import { ApiError } from '../utils/ApiError.js';

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  // Log full error in development, minimal info in production
  if (process.env.NODE_ENV !== 'production') {
    console.error(`❌ [${req.method}] ${req.originalUrl} →`, err);
  } else {
    console.error(`❌ ${err.statusCode || 500} ${err.message}`);
  }

  // Known operational error (thrown via ApiError)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Mongoose duplicate key (e.g., duplicate email on register)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Unknown / unhandled error — don't leak internals in production
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json({ success: false, message });
};

export default errorMiddleware;
