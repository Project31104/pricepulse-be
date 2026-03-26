// services/amazonService.js
// Scrapes Amazon India search results using axios + cheerio.
// Returns prices already in INR (amazon.in lists in ₹ natively).

import axios from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';

// Retry up to 2 times on network errors / 5xx
axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

const BASE_URL = 'https://www.amazon.in/s';

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
  async search(query) {
    const { data: html } = await axios.get(BASE_URL, {
      params: { k: query },
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(html);
    const results = [];

    $('[data-component-type="s-search-result"]').each((_, el) => {
      if (results.length >= 5) return false; // limit to 5 per platform

      const title = $(el).find('h2 span').first().text().trim();
      if (!title) return;

      // Price: whole + fraction
      const whole    = $(el).find('.a-price-whole').first().text().replace(/[^0-9]/g, '');
      const fraction = $(el).find('.a-price-fraction').first().text().replace(/[^0-9]/g, '') || '00';
      const price    = whole ? parseFloat(`${whole}.${fraction}`) : null;
      if (!price) return;

      const asin    = $(el).attr('data-asin') || '';
      const url     = asin ? `https://www.amazon.in/dp/${asin}` : '';
      const image   = $(el).find('img.s-image').attr('src') || '';
      const ratingTxt = $(el).find('.a-icon-alt').first().text();
      const rating  = parseFloat(ratingTxt) || 0;
      const reviews = parseInt(
        $(el).find('.a-size-base.s-underline-text').first().text().replace(/[^0-9]/g, ''), 10
      ) || 0;

      results.push({
        id:       `amazon-${asin || results.length}`,
        name:     title,
        price,           // already in INR (₹)
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
