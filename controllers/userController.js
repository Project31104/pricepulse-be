// ============================================================
// controllers/userController.js — User profile management
// ============================================================
// Handles reading and updating the logged-in user's profile.
// Both routes are protected — req.user is populated by the
// auth middleware before these functions run.

import User from '../models/User.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { notFound, badRequest } from '../utils/ApiError.js';

/**
 * GET /api/users/profile  (protected)
 * Returns the full profile of the currently logged-in user.
 *
 * Response: user object (password is never included)
 */
export const getProfile = async (req, res, next) => {
  try {
    // Re-fetch from DB to get the latest data (req.user may be slightly stale)
    const user = await User.findById(req.user._id);
    if (!user) return next(notFound('User not found'));
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/profile  (protected)
 * Updates the user's name and/or password.
 * At least one field must be provided.
 *
 * Request body: { name?, password? }
 * Response:     updated user object
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, password } = req.body;

    // Reject the request if neither field was sent
    if (!name && !password) return next(badRequest('Provide name or password to update'));

    // Fetch with password so we can update it if needed
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(notFound('User not found'));

    // Only update the fields that were actually provided
    if (name)     user.name     = name.trim();
    if (password) user.password = password; // the pre-save hook in User.js will hash it

    // .save() triggers the pre-save hook (password hashing) and schema validation
    await user.save();
    return sendSuccess(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};
