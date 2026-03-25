// controllers/historyController.js

import SearchHistory from '../models/SearchHistory.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * GET /api/history
 * Returns the authenticated user's search history (most recent first).
 * Supports ?limit=20&page=1
 */
export const getHistory = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || 1, 10));
    const limit = Math.min(50, parseInt(req.query.limit || 20, 10));

    const [history, total] = await Promise.all([
      SearchHistory.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SearchHistory.countDocuments({ userId: req.user._id }),
    ]);

    return sendSuccess(res, history, 'Search history', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/history
 * Clears all search history for the authenticated user.
 */
export const clearHistory = async (req, res, next) => {
  try {
    await SearchHistory.deleteMany({ userId: req.user._id });
    return sendSuccess(res, null, 'Search history cleared');
  } catch (err) {
    next(err);
  }
};
