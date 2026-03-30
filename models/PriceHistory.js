// models/PriceHistory.js
// Stores periodic price snapshots for a product identifier.
// Each document represents one product (keyed by productId),
// and holds an array of { price, recordedAt } snapshots over time.
//
// Data flow:
//   Extension detects product → sends productId + price to POST /api/products/price-history
//   Backend upserts a snapshot into this collection
//   GET /api/products/price-history?productId=... returns the full snapshot array

import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema(
  {
    price:      { type: Number, required: true, min: 0 },
    recordedAt: { type: Date,   required: true, default: Date.now },
  },
  { _id: false }
);

const priceHistorySchema = new mongoose.Schema(
  {
    // Stable identifier derived from the product URL or title (same logic as extension)
    productId: { type: String, required: true, unique: true, index: true },
    title:     { type: String, required: true, trim: true },
    snapshots: { type: [snapshotSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('PriceHistory', priceHistorySchema);
