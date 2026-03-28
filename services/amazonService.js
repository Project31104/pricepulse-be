// ============================================================
// services/amazonService.js — Amazon India scraper
// ============================================================
// Fetches live product listings from amazon.in by sending an HTTP
// request that looks like a real browser visit, then parses the
// HTML response using cheerio (a server-side jQuery-like library).
//
// Why scraping instead of an API?
//   Amazon's Product Advertising API requires an affiliate account.
//   Scraping the public search page is the practical alternative.
//
// Anti-bot measures we use:
//   - Realistic User-Agent header (looks like Chrome on Windows)
//   - Accept-Language set to en-IN (Indian English)
//   - axios-retry: automatically retries on network errors (up to 2×)
//   - 10-second timeout to avoid hanging requests

import axios from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';

// Configure axios to retry failed requests with exponential backoff
// (waits longer between each retry: 1s, 2s, 4s...)
axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

// The Amazon India search URL — we pass the query as the `k` parameter
const BASE_URL = 'https://www.amazon.in/s';

// Browser-like headers to reduce the chance of being blocked by Amazon's bot detection
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
  Accept:
    'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

const amazonService = {
  /**
   * search(query)
   * Scrapes Amazon India search results for the given query.
   *
   * @param {string} query — product name to search for
   * @returns {Product[]}  — array of up to 5 product objects with INR prices
   */
  async search(query) {
    // Fetch the HTML of the Amazon search results page
    const { data: html } = await axios.get(BASE_URL, {
      params:  { k: query }, // ?k=iphone+13
      headers: HEADERS,
      timeout: 10000,        // give up after 10 seconds
    });

    // Load the HTML into cheerio so we can query it like jQuery
    const $ = cheerio.load(html);
    const results = [];

    // Each search result card has the attribute data-component-type="s-search-result"
    $('[data-component-type="s-search-result"]').each((_, el) => {
      // Stop after 5 results to keep responses fast
      if (results.length >= 5) return false;

      // Extract the product title from the h2 heading inside the card
      const title = $(el).find('h2 span').first().text().trim();
      if (!title) return; // skip cards with no title (ads, banners, etc.)

      // Amazon splits the price into two parts: whole (e.g. "68,999") and fraction (e.g. "00")
      // We strip non-numeric characters and combine them into a float
      const whole    = $(el).find('.a-price-whole').first().text().replace(/[^0-9]/g, '');
      const fraction = $(el).find('.a-price-fraction').first().text().replace(/[^0-9]/g, '') || '00';
      const price    = whole ? parseFloat(`${whole}.${fraction}`) : null;
      if (!price) return; // skip products with no visible price

      // ASIN is Amazon's unique product identifier — used to build the direct product URL
      const asin  = $(el).attr('data-asin') || '';
      const url   = asin ? `https://www.amazon.in/dp/${asin}` : '';

      // Product thumbnail image
      const image = $(el).find('img.s-image').attr('src') || '';

      // Rating text looks like "4.5 out of 5 stars" — we parse the number from it
      const ratingTxt = $(el).find('.a-icon-alt').first().text();
      const rating    = parseFloat(ratingTxt) || 0;

      // Review count (e.g. "18,420") — strip commas and parse as integer
      const reviews = parseInt(
        $(el).find('.a-size-base.s-underline-text').first().text().replace(/[^0-9]/g, ''), 10
      ) || 0;

      results.push({
        id:       `amazon-${asin || results.length}`,
        name:     title,
        price,            // already in INR — amazon.in lists prices in ₹
        currency: 'INR',
        platform: 'Amazon',
        url,
        image,
        rating,
        reviews,
      });
    });

    return results;
  },
};

export default amazonService;
