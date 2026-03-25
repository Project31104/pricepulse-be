// controllers/authController.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { badRequest, unauthorized } from '../utils/ApiError.js';

// ── Helper ────────────────────────────────────────────────────────────────────
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const userResponse = (user, token) => ({
  _id:       user._id,
  name:      user.name,
  email:     user.email,
  role:      user.role,
  createdAt: user.createdAt,
  token,
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return next(badRequest('An account with this email already exists'));

    const user  = await User.create({ name, email, password });
    const token = generateToken(user._id);

    return sendSuccess(res, userResponse(user, token), 'Account created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password (it's excluded by default via select:false)
    const user = await User.findOne({ email }).select('+password');
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
 * GET /api/auth/me  (protected)
 * Returns the currently authenticated user's profile.
 */
export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, req.user, 'User profile');
  } catch (err) {
    next(err);
  }
};
