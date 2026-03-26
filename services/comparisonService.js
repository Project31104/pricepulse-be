// services/comparisonService.js
// Parallel scraping across Amazon India + Flipkart.
// All prices are normalised to INR before returning.
// In-memory cache keyed by query (TTL from env, default 10 min).

import amazonService  from './amazonService.js';
import flipkartService from './flipkartService.js';
import { getUsdToInrRate, usdToInr } from '../utils/currencyConverter.js';
import SearchHistory from '../models/SearchHistory.js';

const CACHE_TTL_MS = (parseInt(process.env.CACHE_TTL_MINUTES, 10) || 10) * 60 * 1000;

// Simple in-memory cache: { [queryKey]: { data, ts } }
const _cache = new Map();

class ComparisonService {
  async search(query, userId = null) {
    const key = query.toLowerCase().trim();

    // ── Cache hit ────────────────────────────────────────────────────────────
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { ...cached.data, meta: { ...cached.data.meta, servedFromCache: true } };
    }

    // ── Fetch live exchange rate once per hour ────────────────────────────────
    const inrRate = await getUsdToInrRate();

    // ── Parallel scraping — partial results on failure ────────────────────────
    const [amazonRes, flipkartRes] = await Promise.allSettled([
      amazonService.search(query),
      flipkartService.search(query),
    ]);

    const errors = [];

    const fromAmazon = amazonRes.status === 'fulfilled'
      ? amazonRes.value
      : (errors.push(`Amazon: ${amazonRes.reason?.message}`), []);

    const fromFlipkart = flipkartRes.status === 'fulfilled'
      ? flipkartRes.value
      : (errors.push(`Flipkart: ${flipkartRes.reason?.message}`), []);

    // ── Normalise all prices to INR ───────────────────────────────────────────
    const normalise = (product) => ({
      ...product,
      price:    product.currency === 'INR' ? product.price : usdToInr(product.price, inrRate),
      currency: 'INR',
      url:      product.url || product.productUrl || '',
    });

    const products = [
      ...fromAmazon.map(normalise),
      ...fromFlipkart.map(normalise),
    ].sort((a, b) => a.price - b.price).slice(0, 20);

    // ── Price stats ───────────────────────────────────────────────────────────
    const prices          = products.map((p) => p.price);
    const cheapestPrice   = prices.length ? Math.min(...prices) : null;
    const cheapestPlatform = products[0]?.platform || null;
    const priceRange      = prices.length
      ? { min: cheapestPrice, max: Math.max(...prices) }
      : null;

    // ── Save search history ───────────────────────────────────────────────────
    if (userId && products.length) {
      SearchHistory.create({
        user:          userId,
        query,
        resultCount:   products.length,
        cheapestPrice,
      }).catch(() => {}); // non-blocking, ignore failures
    }

    const result = {
      products,
      meta: {
        query,
        total:            products.length,
        platforms:        ['Amazon', 'Flipkart'],
        currency:         'INR',
        exchangeRate:     inrRate,
        cheapestPrice,
        cheapestPlatform,
        priceRange,
        servedFromCache:  false,
        fetchedAt:        new Date().toISOString(),
        ...(errors.length && { partialErrors: errors }),
      },
    };

    _cache.set(key, { data: result, ts: Date.now() });
    return result;
  }
}

const comparisonService = new ComparisonService();
export default comparisonService;
