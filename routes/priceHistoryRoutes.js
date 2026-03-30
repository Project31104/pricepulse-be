// routes/priceHistoryRoutes.js
// Endpoints:
//   GET  /api/products/price-history?productId=<id>  → fetch history for chart
//   POST /api/products/price-history                 → record a new price snapshot

import express from 'express';
import { getPriceHistory, recordPriceSnapshot } from '../controllers/priceHistoryController.js';

const router = express.Router();

router.get('/price-history',  getPriceHistory);
router.post('/price-history', recordPriceSnapshot);

export default router;
