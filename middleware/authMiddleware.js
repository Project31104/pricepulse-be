// ============================================================
// middleware/authMiddleware.js — JWT authentication guards
// ============================================================
// Middleware sits between the incoming HTTP request and the route
// handler. These two middleware functions check whether the user
// has a valid JSON Web Token (JWT) in their Authorization header.
//
// How JWT auth works:
//   1. User logs in → server returns a signed token
//   2. Client stores the token and sends it with every request:
//      Authorization: Bearer <token>
//   3. These middleware functions verify the token on each request

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { unauthorized } from '../utils/ApiError.js';

// ── protect ───────────────────────────────────────────────────────────────────
// Hard authentication gate — BLOCKS the request if no valid token is present.
// Use this on routes that require the user to be logged in
// (e.g. viewing profile, clearing history).
//
// Input:  req.headers.authorization = "Bearer <jwt_token>"
// Output: attaches req.user (the full User document) and calls next()
//         OR returns a 401 Unauthorized error
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check that the header exists and follows the "Bearer <token>" format
  if (!authHeader?.startsWith('Bearer ')) {
    return next(unauthorized('Not authorized — no token provided'));
  }

  try {
    // Extract the token string after "Bearer "
    const token = authHeader.split(' ')[1];

    // Verify the token signature using our secret key.
    // jwt.verify() throws if the token is invalid or expired.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Look up the user in the database using the ID stored inside the token.
    // We exclude the password field (it has select:false in the schema).
    req.user = await User.findById(decoded.id);
    if (!req.user) return next(unauthorized('User no longer exists'));

    // Token is valid and user exists — pass control to the route handler
    next();
  } catch (err) {
    return next(unauthorized('Not authorized — invalid or expired token'));
  }
};

// ── optionalAuth ──────────────────────────────────────────────────────────────
// Soft authentication — ALLOWS the request through whether or not a token
// is present. If a valid token is found, req.user is populated.
// If no token (or an invalid one), req.user is set to null.
//
// Use this on public routes that can optionally personalise their response
// for logged-in users (e.g. saving search history when logged in).
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // No token at all — treat as anonymous and continue
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch {
    // Token present but invalid — still allow the request, just as anonymous
    req.user = null;
  }

  next();
};

export default protect;

// Named alias so routes can import { auth } instead of { protect }
export const auth = protect;
