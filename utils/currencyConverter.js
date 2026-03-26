// utils/currencyConverter.js
// Fetches live USD → INR exchange rate.
// Falls back to FALLBACK_RATE if the API is unavailable.

import axios from 'axios';

const FALLBACK_RATE = 83;          // static fallback (1 USD = 83 INR)
const CACHE_MS     = 60 * 60 * 1000; // refresh rate every 1 hour

let _cache = { rate: FALLBACK_RATE, fetchedAt: 0 };

/**
 * Returns the current USD → INR exchange rate.
 * Uses exchangerate-api.com (free tier, no key needed for open endpoint).
 */
export async function getUsdToInrRate() {
  if (Date.now() - _cache.fetchedAt < CACHE_MS) return _cache.rate;

  try {
    // Free open endpoint — no API key required
    const { data } = await axios.get(
      'https://open.er-api.com/v6/latest/USD',
      { timeout: 4000 }
    );
    const rate = data?.rates?.INR;
    if (rate && typeof rate === 'number') {
      _cache = { rate, fetchedAt: Date.now() };
      return rate;
    }
  } catch {
    // silently fall through to fallback
  }

  return FALLBACK_RATE;
}

/**
 * Converts a USD amount to INR, rounded to nearest rupee.
 * @param {number} usd
 * @param {number} [rate]  pass a pre-fetched rate to avoid extra await
 */
export function usdToInr(usd, rate = FALLBACK_RATE) {
  return Math.round(usd * rate);
}
