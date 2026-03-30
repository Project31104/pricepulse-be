// services/ebayService.js — eBay scraper (eBay.com)
import axios from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';
import { usdToInr, getUsdToInrRate } from '../utils/currencyConverter.js';

axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

const BASE_URL = 'https://www.ebay.com/sch/i.html';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Connection: 'keep-alive',
};

const ebayService = {
  async search(query) {
    const inrRate = await getUsdToInrRate();

    const { data: html } = await axios.get(BASE_URL, {
      params:  { _nkw: query, _sacat: 0, LH_BIN: 1 }, // Buy It Now only
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(html);
    const results = [];

    $('.s-item').each((_, el) => {
      if (results.length >= 5) return false;

      // Skip the first ghost "item" eBay injects as a template
      const title = $(el).find('.s-item__title').text().trim();
      if (!title || title === 'Shop on eBay') return;

      // Price — eBay shows "$XX.XX" or "₹XX,XXX"
      const priceRaw = $(el).find('.s-item__price').first().text().trim();
      // Strip currency symbols and commas, handle ranges like "$10.00 to $20.00"
      const priceMatch = priceRaw.replace(/,/g, '').match(/[\d.]+/);
      if (!priceMatch) return;

      const rawPrice = parseFloat(priceMatch[0]);
      if (!rawPrice) return;

      // Convert to INR — eBay.com lists in USD
      const price = usdToInr(rawPrice, inrRate);

      const url   = $(el).find('a.s-item__link').attr('href')?.split('?')[0] || '';
      const image = $(el).find('.s-item__image-img').attr('src') || '';

      // Rating — eBay shows "X stars out of 5"
      const ratingTxt = $(el).find('.x-star-rating .clipped').text();
      const rating    = parseFloat(ratingTxt) || 0;

      // Review count
      const reviewsTxt = $(el).find('.s-item__reviews-count span').first().text();
      const reviews    = parseInt(reviewsTxt.replace(/[^0-9]/g, ''), 10) || 0;

      results.push({
        id:       `ebay-${results.length}`,
        name:     title,
        price,
        currency: 'INR',
        platform: 'eBay',
        url,
        image,
        rating,
        reviews,
      });
    });

    return results;
  },
};

export default ebayService;
