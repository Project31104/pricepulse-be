// routes/historyRoutes.js
import express from 'express';
import { getHistory, clearHistory } from '../controllers/historyController.js';
import { auth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/history — get user's search history
router.get('/', auth, getHistory);

// DELETE /api/history — clear user's search history
router.delete('/', auth, clearHistory);

export default router;