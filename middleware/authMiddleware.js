// middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { unauthorized } from '../utils/ApiError.js';

/**
 * protect — hard auth gate.
 * Rejects the request if no valid JWT is present.
 * Use on routes that require login.
 */
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(unauthorized('Not authorized — no token provided'));
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (password excluded via select:false in schema)
    req.user = await User.findById(decoded.id);
    if (!req.user) return next(unauthorized('User no longer exists'));

    next();
  } catch (err) {
    return next(unauthorized('Not authorized — invalid or expired token'));
  }
};

/**
 * optionalAuth — soft auth.
 * Attaches req.user if a valid token is present, but does NOT reject
 * the request if there's no token. Use on public routes that benefit
 * from knowing who the user is (e.g., search history logging).
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch {
    req.user = null; // invalid token → treat as anonymous
  }

  next();
};

export default protect;

// Alias for convenience
export const auth = protect;
