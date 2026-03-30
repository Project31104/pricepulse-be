// services/etsyService.js — Etsy scraper (etsy.com)
import axios from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';
import { usdToInr, getUsdToInrRate } from '../utils/currencyConverter.js';

axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

const BASE_URL = 'https://www.etsy.com/search';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Connection: 'keep-alive',
};

const etsyService = {
  async search(query) {
    const inrRate = await getUsdToInrRate();

    const { data: html } = await axios.get(BASE_URL, {
      params:  { q: query },
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(html);
    const results = [];

    // Etsy listing cards
    $('div[data-search-results-lg] li[data-palette-listing-id], .wt-grid__item-xs-6').each((_, el) => {
      if (results.length >= 5) return false;

      const title = $(el).find('h3, .v2-listing-card__title').text().trim();
      if (!title) return;

      // Price — Etsy shows "$XX.XX" or "From $XX.XX"
      const priceRaw   = $(el).find('.currency-value, .lc-price .currency-value').first().text().trim();
      const rawPrice   = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
      if (!rawPrice) return;

      const price = usdToInr(rawPrice, inrRate);

      const href  = $(el).find('a[href*="/listing/"]').first().attr('href') || '';
      const url   = href.startsWith('http') ? href.split('?')[0] : `https://www.etsy.com${href.split('?')[0]}`;
      const image = $(el).find('img').first().attr('src') || '';

      // Etsy shows star ratings as aria-label="X out of 5 stars"
      const ratingLabel = $(el).find('[aria-label*="out of 5"]').attr('aria-label') || '';
      const ratingMatch = ratingLabel.match(/([\d.]+)\s+out of 5/);
      const rating      = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

      const reviewsTxt = $(el).find('.wt-text-caption').text();
      const reviews    = parseInt(reviewsTxt.replace(/[^0-9]/g, ''), 10) || 0;

      results.push({
        id:       `etsy-${results.length}`,
        name:     title,
        price,
        currency: 'INR',
        platform: 'Etsy',
        url,
        image,
        rating,
        reviews,
      });
    });

    return results;
  },
};

export default etsyService;
