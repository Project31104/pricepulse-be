// ============================================================
// services/flipkartService.js — Flipkart scraper
// ============================================================
// Fetches live product listings from flipkart.com using the same
// approach as amazonService.js: HTTP request + cheerio HTML parsing.
//
// Flipkart challenge: their CSS class names are auto-generated and
// change frequently (e.g. "_30jeq3" becomes something else after a
// site update). We try multiple known selectors to stay resilient.

import axios from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';

// Retry up to 2 times with exponential backoff on network failures
axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

// Flipkart search URL — query goes in the `q` parameter
const BASE_URL = 'https://www.flipkart.com/search';

// Browser-like headers to avoid bot detection
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
  Accept:
    'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Connection: 'keep-alive',
};

/**
 * parseInrPrice(raw)
 * Strips the ₹ symbol, commas, and spaces from a price string
 * and converts it to a JavaScript number.
 *
 * Example: "₹68,999" → 68999
 */
const parseInrPrice = (raw) => {
  const cleaned = raw.replace(/[₹,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const flipkartService = {
  /**
   * search(query)
   * Scrapes Flipkart search results for the given query.
   *
   * @param {string} query — product name to search for
   * @returns {Product[]}  — array of up to 5 product objects with INR prices
   */
  async search(query) {
    // Fetch the Flipkart search results page HTML
    const { data: html } = await axios.get(BASE_URL, {
      params:  { q: query }, // ?q=iphone+13
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(html);
    const results = [];

    // Flipkart uses different HTML structures for different product categories.
    // We try two known container selectors and use whichever finds cards.
    const CARD_SELECTORS = [
      'div[data-id]', // used on most product listing pages
      '._1AtVbE',     // older layout fallback
    ];

    let cards = $();
    for (const sel of CARD_SELECTORS) {
      cards = $(sel);
      if (cards.length > 0) break; // stop as soon as we find cards
    }

    cards.each((_, el) => {
      if (results.length >= 5) return false; // limit to 5 results

      // Product title — try the current known class name
      const title = $(el).find('.RG5Slk').text().trim();
      if (!title) return; // skip cards with no title

      // Price — try the current known class name
      const priceRaw = $(el).find('.hZ3P6w.DeU9vF').text();
      const price    = parseInrPrice(priceRaw);
      if (!price) return; // skip products with no visible price

      // Product link — build the full URL from the relative href
      const href = $(el).find('a.k7wcnx').attr('href') || '';
      const url  = href ? `https://www.flipkart.com${href.split('?')[0]}` : '';

      // Product thumbnail image
      const image = $(el).find('img.UCc1lI').attr('src') || '';

      // Star rating (e.g. "4.3")
      const ratingRaw = $(el).find('.CjyrHS .MKiFS6').first().text().trim();
      const rating    = parseFloat(ratingRaw) || 0;

      // Review count — Flipkart shows it as "1,234 Ratings"
      const reviewsText  = $(el).find('.PvbNMB').text().trim();
      const reviewsMatch = reviewsText.match(/(\d+)\s*Ratings/);
      const reviews      = reviewsMatch ? parseInt(reviewsMatch[1], 10) : 0;

      results.push({
        id:       `flipkart-${results.length}`,
        name:     title,
        price,            // already in INR — flipkart.com lists prices in ₹
        currency: 'INR',
        platform: 'Flipkart',
        url,
        image,
        rating,
        reviews,
      });
    });

    return results;
  },
};

export default flipkartService;
