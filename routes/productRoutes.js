// routes/productRoutes.js
import express from 'express';
import {
  searchProducts,
  getProductById,
  getTrending,
  compareLinkProducts,
} from '../controllers/productController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { validateSearch, validateCompareLink } from '../middleware/validateMiddleware.js';
import { searchLimiter } from '../config/rateLimiter.js';

const router = express.Router();

// GET /api/products/trending — must be before /:id to avoid route conflict
router.get('/trending', getTrending);

// GET /api/products/search?q=...
router.get('/search', searchLimiter, optionalAuth, validateSearch, searchProducts);

// POST /api/products/compare-link  — paste a URL, get cross-platform comparison
router.post('/compare-link', searchLimiter, optionalAuth, validateCompareLink, compareLinkProducts);

// GET /api/products/:id
router.get('/:id', getProductById);

export default router;
