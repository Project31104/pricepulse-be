// controllers/userController.js

import User from '../models/User.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { notFound, badRequest } from '../utils/ApiError.js';

/**
 * GET /api/users/profile  (protected)
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(notFound('User not found'));
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/profile  (protected)
 * Allows updating name and/or password.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    if (!name && !password) return next(badRequest('Provide name or password to update'));

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(notFound('User not found'));

    if (name)     user.name     = name.trim();
    if (password) user.password = password; // pre-save hook will hash it

    await user.save();
    return sendSuccess(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};
