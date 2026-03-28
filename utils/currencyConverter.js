// ============================================================
// utils/currencyConverter.js — Live USD → INR exchange rate
// ============================================================
// Amazon and Flipkart already list prices in INR (₹), so this
// utility is mainly a safety net for any future platform that
// returns prices in USD.
//
// How it works:
//   1. On first call, fetches the live rate from open.er-api.com
//      (free, no API key required)
//   2. Caches the rate in memory for 1 hour to avoid hammering
//      the external API on every search request
//   3. If the external API is down or slow, falls back to a
//      hardcoded static rate (₹83 per $1)

import axios from 'axios';

const FALLBACK_RATE = 83;             // static fallback: 1 USD = ₹83
const CACHE_MS      = 60 * 60 * 1000; // cache the rate for 1 hour

// In-memory cache object — starts with the fallback rate
let _cache = { rate: FALLBACK_RATE, fetchedAt: 0 };

/**
 * getUsdToInrRate()
 * Returns the current USD → INR exchange rate.
 * Uses a cached value if it's less than 1 hour old.
 *
 * @returns {Promise<number>} — e.g. 83.42
 */
export async function getUsdToInrRate() {
  // Return the cached rate if it's still fresh (less than 1 hour old)
  if (Date.now() - _cache.fetchedAt < CACHE_MS) return _cache.rate;

  try {
    // Fetch the latest rates from the free open exchange rate API
    const { data } = await axios.get(
      'https://open.er-api.com/v6/latest/USD',
      { timeout: 4000 } // give up after 4 seconds to avoid slowing down searches
    );

    const rate = data?.rates?.INR;

    // Validate the response before using it
    if (rate && typeof rate === 'number') {
      _cache = { rate, fetchedAt: Date.now() }; // update the cache
      return rate;
    }
  } catch {
    // Network error or unexpected response — silently fall through to fallback
  }

  // Return the static fallback rate if the API call failed
  return FALLBACK_RATE;
}

/**
 * usdToInr(usd, rate)
 * Converts a USD price to INR, rounded to the nearest whole rupee.
 *
 * @param {number} usd  — price in US dollars (e.g. 9.99)
 * @param {number} rate — exchange rate (e.g. 83.42), defaults to fallback
 * @returns {number}    — price in INR (e.g. 833)
 */
export function usdToInr(usd, rate = FALLBACK_RATE) {
  return Math.round(usd * rate);
}
