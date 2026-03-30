// ============================================================
// controllers/productController.js — Product search & comparison
// ============================================================
// This is the core of the application. It handles:
//   - Searching products by name across all platforms
//   - Fetching a single product by its database ID
//   - Returning trending searches from the last 24 hours
//   - Comparing prices by pasting a product URL

import comparisonService from '../services/comparisonService.js';
import Product from '../models/Product.js';
import SearchHistory from '../models/SearchHistory.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { notFound, badRequest } from '../utils/ApiError.js';
import { extractProductInfo } from '../utils/urlParser.js';
import { rankProducts, extractBrand } from '../utils/rankProducts.js';

/**
 * GET /api/products/search?q=query&page=1&limit=20&sort=price_asc&platform=Amazon,Flipkart
 *
 * Main search endpoint. Calls the comparison service which scrapes
 * Amazon and Flipkart in parallel, then applies filtering, sorting,
 * and pagination before returning the results.
 *
 * Query params:
 *   q        — search term (required)
 *   page     — page number for pagination (default: 1)
 *   limit    — results per page, max 50 (default: 20)
 *   sort     — price_asc | price_desc | rating | reviews (default: price_asc)
 *   platform — comma-separated list to filter by platform (e.g. "Amazon,Flipkart")
 *
 * Response: array of product objects + meta (total, cheapestPrice, etc.)
 */
export const searchProducts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20, sort = 'price_asc', platform } = req.query;

    // Delegate the actual scraping and caching to the comparison service.
    // req.user?._id is passed so history can be saved for logged-in users.
    const { products, meta } = await comparisonService.search(q, req.user?._id || null);

    // ── Platform filter ────────────────────────────────────────────────────
    // If the client requested specific platforms, filter out the rest
    let filtered = products;
    if (platform) {
      const platforms = platform.split(',').map((p) => p.trim());
      filtered = products.filter((p) => platforms.includes(p.platform));
    }

    // ── Sorting ────────────────────────────────────────────────────────────
    // Default sort is relevance (already applied by comparisonService).
    // Explicit sort param overrides relevance ranking.
    const sortMap = {
      price_asc:  (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      rating:     (a, b) => b.rating - a.rating,
      reviews:    (a, b) => b.reviews - a.reviews,
    };
    if (sort !== 'relevance' && sortMap[sort]) filtered = [...filtered].sort(sortMap[sort]);

    // ── Pagination ─────────────────────────────────────────────────────────
    // Slice the sorted array to return only the requested page
    const pageNum    = Math.max(1, parseInt(page, 10));
    const limitNum   = Math.min(50, Math.max(1, parseInt(limit, 10))); // cap at 50
    const totalPages = Math.ceil(filtered.length / limitNum);
    const paginated  = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return sendSuccess(
      res,
      paginated,
      `Found ${filtered.length} results for "${q}"`,
      200,
      {
        query:            q,
        queryBrand:       extractBrand(q),
        total:            filtered.length,
        page:             pageNum,
        limit:            limitNum,
        totalPages,
        hasNextPage:      pageNum < totalPages,
        hasPrevPage:      pageNum > 1,
        servedFromCache:  meta.servedFromCache,
        cheapestPrice:    meta.cheapestPrice,
        cheapestPlatform: meta.cheapestPlatform,
        priceRange:       meta.priceRange,
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id
 * Fetches a single product document from MongoDB by its _id.
 * Used by the ProductDetail page in the frontend.
 *
 * URL param: id — MongoDB ObjectId string
 * Response:  single product object
 */
export const getProductById = async (req, res, next) => {
  try {
    // .lean() returns a plain JS object instead of a Mongoose document (faster)
    const product = await Product.findById(req.params.id).lean();
    if (!product) return next(notFound('Product not found'));
    return sendSuccess(res, product);
  } catch (err) {
    // CastError happens when the id string is not a valid MongoDB ObjectId format
    if (err.name === 'CastError') return next(badRequest('Invalid product ID'));
    next(err);
  }
};

/**
 * GET /api/products/trending
 * Returns the top 10 most searched product queries in the last 24 hours.
 * Uses MongoDB aggregation to count and rank queries from SearchHistory.
 *
 * Response: array of { query, count, avgCheapestPrice }
 */
export const getTrending = async (req, res, next) => {
  try {
    // Calculate the timestamp for 24 hours ago
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // MongoDB aggregation pipeline:
    //   1. $match  — only look at searches from the last 24 hours
    //   2. $group  — count how many times each query was searched
    //   3. $sort   — most searched first
    //   4. $limit  — top 10 only
    //   5. $project — rename fields for a clean response shape
    const trending = await SearchHistory.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$query', count: { $sum: 1 }, avgCheapestPrice: { $avg: '$cheapestPrice' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, query: '$_id', count: 1, avgCheapestPrice: { $round: ['$avgCheapestPrice', 2] } } },
    ]);

    return sendSuccess(res, trending, 'Trending searches', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products/compare-link
 * Accepts a product URL pasted by the user, extracts the product name
 * from the URL structure, then runs a full cross-platform comparison.
 *
 * Request body: { url: "https://www.amazon.in/dp/B09G9HD6PD" }
 *
 * Response: {
 *   parsedProduct: { name, platform, originalUrl },
 *   products: [...sorted comparison results],
 *   meta: { cheapestPrice, cheapestPlatform, priceRange, ... }
 * }
 */
export const compareLinkProducts = async (req, res, next) => {
  try {
    const { url } = req.body;

    // ── Step 1: Parse the URL ────────────────────────────────────────────────
    // extractProductInfo reads the URL path/query params to figure out
    // the platform and extract a human-readable product name without scraping
    const parsed = extractProductInfo(url);

    if (!parsed.isValid) {
      return next(
        badRequest(
          parsed.platform === 'Unknown'
            ? 'Unsupported platform. Please use an Amazon, Flipkart, Etsy, or eBay URL.'
            : 'Could not extract a product name from this URL. Try searching by name instead.'
        )
      );
    }

    // ── Step 2: Run comparison using the extracted product name ──────────────
    // This is the same search that the name-based search uses —
    // we just derived the query from the URL instead of a text input
    const { products, meta } = await comparisonService.search(
      parsed.name,
      req.user?._id || null
    );

    if (!products.length) {
      return next(notFound(`No comparison results found for "${parsed.name}"`));
    }

    // ── Step 3: Rank by relevance then price ──────────────────────────────
    const sorted = rankProducts(products, parsed.name);
    sorted.forEach((p, i) => { p.isCheapest = i === 0; });

    // ── Step 4: Calculate price statistics ───────────────────────────────────
    const prices   = sorted.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = +(prices.reduce((s, p) => s + p, 0) / prices.length).toFixed(2);

    return sendSuccess(
      res,
      {
        // Info about what was extracted from the URL
        parsedProduct: {
          name:        parsed.name,
          platform:    parsed.platform,
          originalUrl: parsed.originalUrl,
        },
        products: sorted,
        meta: {
          ...meta,
          total:            sorted.length,
          extractedQuery:   parsed.name,
          sourcePlatform:   parsed.platform,
          cheapestPrice:    minPrice,
          cheapestPlatform: sorted[0]?.platform,
          priceRange:       { min: minPrice, max: maxPrice, avg: avgPrice },
        },
      },
      `Comparison results for "${parsed.name}"`,
      200
    );
  } catch (err) {
    next(err);
  }
};
