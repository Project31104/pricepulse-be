// ============================================================
// controllers/authController.js — User authentication
// ============================================================
// Handles user registration and login.
// After a successful login or register, a JWT (JSON Web Token)
// is returned to the client. The client stores this token and
// sends it with future requests to prove who they are.

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { badRequest, unauthorized } from '../utils/ApiError.js';

// ── Private helpers ───────────────────────────────────────────────────────────

// Creates a signed JWT containing the user's ID.
// The token expires after JWT_EXPIRES_IN (default 7 days).
// Anyone who has this token can prove they are this user.
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// Builds the safe user object that gets sent back to the client.
// We never send the password hash, even though it's excluded by
// the schema's select:false — this is an extra safety layer.
const userResponse = (user, token) => ({
  _id:       user._id,
  name:      user.name,
  email:     user.email,
  role:      user.role,
  createdAt: user.createdAt,
  token,     // The JWT the client will use for future authenticated requests
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a new user account.
 *
 * Request body: { name, email, password }
 * Response:     { user data + JWT token }
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if an account with this email already exists
    const exists = await User.findOne({ email });
    if (exists) return next(badRequest('An account with this email already exists'));

    // Create the user — the password is hashed automatically by the
    // pre-save hook defined in the User model before it hits the database
    const user  = await User.create({ name, email, password });
    const token = generateToken(user._id);

    // 201 = "Created" — the standard HTTP status for a new resource
    return sendSuccess(res, userResponse(user, token), 'Account created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticates an existing user and returns a JWT.
 *
 * Request body: { email, password }
 * Response:     { user data + JWT token }
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find the user by email. We must explicitly request the password
    // field because the schema hides it by default (select: false).
    const user = await User.findOne({ email }).select('+password');

    // If no user found OR the password doesn't match, return the same
    // generic error message — never reveal which part was wrong
    if (!user || !(await user.matchPassword(password))) {
      return next(unauthorized('Invalid email or password'));
    }

    const token = generateToken(user._id);
    return sendSuccess(res, userResponse(user, token), 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me  (protected route — requires valid JWT)
 * Returns the currently logged-in user's profile.
 * req.user is already populated by the protect middleware.
 *
 * Response: { user data }
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user was attached by the protect middleware — no DB query needed
    return sendSuccess(res, req.user, 'User profile');
  } catch (err) {
    next(err);
  }
};
