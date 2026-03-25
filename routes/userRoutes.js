// routes/userRoutes.js
import express from 'express';
import { getProfile } from '../controllers/userController.js';
import { auth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users/profile — requires authentication
router.get('/profile', auth, getProfile);

export default router;