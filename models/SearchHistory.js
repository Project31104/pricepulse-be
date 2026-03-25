// models/SearchHistory.js
// Tracks every search made — useful for analytics, trending products,
// and showing users their own search history.

import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema(
  {
    // null = anonymous search, ObjectId = logged-in user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    query:        { type: String, required: true, lowercase: true, trim: true },
    resultsCount: { type: Number, default: 0 },       // how many results were returned
    servedFromCache: { type: Boolean, default: false }, // was this a cache hit?

    // Cheapest price found across all platforms for this search
    cheapestPrice:    { type: Number, default: null },
    cheapestPlatform: { type: String, default: null },
  },
  { timestamps: true } // createdAt = when the search happened
);

// Index for "recent searches by user" queries
searchHistorySchema.index({ userId: 1, createdAt: -1 });

// Index for "trending searches" (most searched queries globally)
searchHistorySchema.index({ query: 1 });

export default mongoose.model('SearchHistory', searchHistorySchema);
