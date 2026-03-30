// ============================================================
// services/comparisonService.js — Core price comparison engine
// ============================================================
// This is the heart of the backend. When a search query comes in,
// this service:
//   1. Checks an in-memory cache to avoid redundant scraping
//   2. Fetches the live USD→INR exchange rate
//   3. Scrapes Amazon India and Flipkart IN PARALLEL
//   4. Normalises all prices to INR
//   5. Sorts results cheapest-first and calculates price stats
//   6. Saves the search to history (if user is logged in)
//   7. Caches the result for future requests

import amazonService   from './amazonService.js';
import flipkartService from './flipkartService.js';
import { getUsdToInrRate, usdToInr } from '../utils/currencyConverter.js';
import SearchHistory from '../models/SearchHistory.js';
import { rankProducts } from '../utils/rankProducts.js';

// Cache TTL: read from .env (CACHE_TTL_MINUTES), default 10 minutes
const CACHE_TTL_MS = (parseInt(process.env.CACHE_TTL_MINUTES, 10) || 10) * 60 * 1000;

// In-memory cache stored as a Map: { queryKey → { data, ts } }
// This lives in RAM so it resets when the server restarts.
// For production, consider Redis for a persistent shared cache.
const _cache = new Map();

class ComparisonService {
  /**
   * search(query, userId)
   *
   * @param {string}      query  — the product name to search for
   * @param {string|null} userId — MongoDB user ID (null for anonymous users)
   * @returns {{ products: Product[], meta: object }}
   */
  async search(query, userId = null) {
    // Normalise the cache key so "iPhone" and "iphone" hit the same entry
    const key = query.toLowerCase().trim();

    // ── Cache check ──────────────────────────────────────────────────────────
    // If we have a recent result for this query, return it immediately
    // without making any network requests to the e-commerce sites
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { ...cached.data, meta: { ...cached.data.meta, servedFromCache: true } };
    }

    // ── Exchange rate ────────────────────────────────────────────────────────
    // Get the current USD→INR rate (cached internally for 1 hour)
    // so we can convert any USD prices to INR
    const inrRate = await getUsdToInrRate();

    // ── Parallel scraping ────────────────────────────────────────────────────
    // Promise.allSettled runs both scrapers at the same time and waits for
    // BOTH to finish, even if one fails. This is faster than running them
    // one after the other (sequential would take 2× as long).
    const [amazonRes, flipkartRes] = await Promise.allSettled([
      amazonService.search(query),
      flipkartService.search(query),
    ]);

    // Collect error messages from any scrapers that failed
    const errors = [];

    // If Amazon scraping succeeded, use the results; otherwise log the error
    // and use an empty array so the rest of the code still works
    const fromAmazon = amazonRes.status === 'fulfilled'
      ? amazonRes.value
      : (errors.push(`Amazon: ${amazonRes.reason?.message}`), []);

    const fromFlipkart = flipkartRes.status === 'fulfilled'
      ? flipkartRes.value
      : (errors.push(`Flipkart: ${flipkartRes.reason?.message}`), []);

    // ── Price normalisation ──────────────────────────────────────────────────
    // Both scrapers return prices in INR already (amazon.in and flipkart.com
    // list in ₹). This normalise function handles the edge case where a
    // product price might come in as USD (e.g. from a future eBay integration).
    const normalise = (product) => ({
      ...product,
      price:    product.currency === 'INR' ? product.price : usdToInr(product.price, inrRate),
      currency: 'INR',
      url:      product.url || product.productUrl || '', // unify url field names
    });

    // Combine results from both platforms, normalise, then rank by relevance
    // (same brand / exact model first, cheaper alternatives last).
    // rankProducts returns a new array sorted by relevanceScore desc, price asc.
    const products = rankProducts(
      [...fromAmazon.map(normalise), ...fromFlipkart.map(normalise)],
      query
    ).slice(0, 20);

    // ── Price statistics ─────────────────────────────────────────────────────
    const prices           = products.map((p) => p.price);
    const cheapestPrice    = prices.length ? Math.min(...prices) : null;
    const cheapestPlatform = products[0]?.platform || null;
    const priceRange       = prices.length
      ? { min: cheapestPrice, max: Math.max(...prices) }
      : null;

    // ── Search history ───────────────────────────────────────────────────────
    // Save this search to the database for logged-in users.
    // We use .catch(() => {}) to make this non-blocking — if the DB write
    // fails, we don't want it to crash the whole search response.
    if (userId && products.length) {
      SearchHistory.create({
        user:          userId,
        query,
        resultCount:   products.length,
        cheapestPrice,
      }).catch(() => {});
    }

    // ── Build result object ──────────────────────────────────────────────────
    const result = {
      products,
      meta: {
        query,
        total:            products.length,
        platforms:        ['Amazon', 'Flipkart'],
        currency:         'INR',
        exchangeRate:     inrRate,       // the rate used for any USD→INR conversions
        cheapestPrice,
        cheapestPlatform,
        priceRange,
        servedFromCache:  false,
        fetchedAt:        new Date().toISOString(), // timestamp shown in the extension popup
        // Only include partialErrors key if there were actually errors
        ...(errors.length && { partialErrors: errors }),
      },
    };

    // Store in cache with the current timestamp
    _cache.set(key, { data: result, ts: Date.now() });
    return result;
  }
}

const comparisonService = new ComparisonService();
export default comparisonService;
