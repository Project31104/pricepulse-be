// controllers/priceHistoryController.js
// Handles storing and retrieving price history snapshots.
//
// Data flow:
//   1. Extension popup calls POST /api/products/price-history with
//      { productId, title, price } each time it fetches live prices.
//   2. Backend upserts a snapshot into the PriceHistory collection.
//   3. Extension popup calls GET /api/products/price-history?productId=...
//      to retrieve the full history array for the chart.

import PriceHistory from '../models/PriceHistory.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { badRequest } from '../utils/ApiError.js';

// Minimum interval between snapshots for the same product (1 hour).
// Prevents flooding the DB when the user opens the popup repeatedly.
const MIN_INTERVAL_MS = 60 * 60 * 1000;

/**
 * GET /api/products/price-history?productId=<id>
 * Returns the full snapshot array for a product, formatted for Chart.js.
 *
 * Response: { data: [{ date, price }, ...], stats: { min, max, avg, current } }
 */
export const getPriceHistory = async (req, res, next) => {
  try {
    const { productId } = req.query;
    if (!productId) return next(badRequest('productId query param is required'));

    const record = await PriceHistory.findOne({ productId }).lean();

    if (!record || !record.snapshots.length) {
      return sendSuccess(res, { data: [], stats: null }, 'No price history available');
    }

    // Shape each snapshot into { date, price } for the frontend chart
    const data = record.snapshots.map((s) => ({
      date:  new Date(s.recordedAt).toISOString().split('T')[0], // "YYYY-MM-DD"
      price: s.price,
    }));

    const prices  = record.snapshots.map((s) => s.price);
    const min     = Math.min(...prices);
    const max     = Math.max(...prices);
    const avg     = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const current = prices[prices.length - 1];

    return sendSuccess(res, { data, stats: { min, max, avg, current } }, 'Price history');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products/price-history
 * Body: { productId, title, price }
 *
 * Upserts a price snapshot. Skips the write if the last snapshot was
 * recorded less than MIN_INTERVAL_MS ago AND the price hasn't changed.
 */
export const recordPriceSnapshot = async (req, res, next) => {
  try {
    const { productId, title, price } = req.body;
    if (!productId || !title || price == null) {
      return next(badRequest('productId, title, and price are required'));
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) return next(badRequest('price must be a non-negative number'));

    const now    = new Date();
    const record = await PriceHistory.findOne({ productId });

    if (record) {
      const last       = record.snapshots[record.snapshots.length - 1];
      const timeDiff   = now - new Date(last.recordedAt);
      const priceChanged = last.price !== numPrice;

      // Only append if price changed OR enough time has passed
      if (priceChanged || timeDiff >= MIN_INTERVAL_MS) {
        record.snapshots.push({ price: numPrice, recordedAt: now });
        await record.save();
      }
    } else {
      await PriceHistory.create({
        productId,
        title,
        snapshots: [{ price: numPrice, recordedAt: now }],
      });
    }

    return sendSuccess(res, null, 'Snapshot recorded');
  } catch (err) {
    next(err);
  }
};
