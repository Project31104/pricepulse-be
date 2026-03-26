// models/Product.js
// Represents a single normalized product listing from any platform.
// Multiple Product documents can share the same searchQuery (one per platform result).

import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    // The search term that produced this result
    searchQuery: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true, // indexed for fast cache lookups
    },

    // Normalized product fields — same shape regardless of source platform
    name:        { type: String, required: true, trim: true },
    price:       { type: Number, required: true, min: 0 },
    currency:    { type: String, default: 'INR' },
    platform:    { type: String, required: true, enum: ['Amazon', 'Flipkart', 'eBay', 'Etsy'] },
    rating:      { type: Number, min: 0, max: 5, default: 0 },
    reviews:     { type: Number, default: 0 },
    image:       { type: String, default: '' },
    productUrl:  { type: String, default: '' },
    isCheapest:  { type: Boolean, default: false }, // flagged after comparison

    // When this cached record expires
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index — auto-deletes expired docs
    },
  },
  { timestamps: true }
);

// Compound index: fast lookup of all cached results for a query
productSchema.index({ searchQuery: 1, platform: 1 });

export default mongoose.model('Product', productSchema);
