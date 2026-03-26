// services/flipkartService.js
// Scrapes Flipkart search results using axios + cheerio.
// Returns prices in INR (Flipkart lists in ₹ natively).

import axios from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';

axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

const BASE_URL = 'https://www.flipkart.com/search';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
  Accept:
    'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Connection: 'keep-alive',
};

/** Strip ₹ symbol, commas, spaces and parse to float */
const parseInrPrice = (raw) => {
  const cleaned = raw.replace(/[₹,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const flipkartService = {
  async search(query) {
    const { data: html } = await axios.get(BASE_URL, {
      params: { q: query },
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(html);
    const results = [];

    // Flipkart uses different container classes for different layouts;
    // we try both grid-card and list-card selectors.
    const CARD_SELECTORS = [
      'div[data-id]',           // most product pages
      '._1AtVbE',               // older layout fallback
    ];

    let cards = $();
    for (const sel of CARD_SELECTORS) {
      cards = $(sel);
      if (cards.length > 0) break;
    }

    cards.each((_, el) => {
      if (results.length >= 5) return false;

      // Title — try multiple known class names
      const title =
        $(el).find('._4rR01T').text().trim() ||
        $(el).find('.s1Q9rs').text().trim()  ||
        $(el).find('.IRpwTa').text().trim()  ||
        $(el).find('a[title]').attr('title') ||
        '';
      if (!title) return;

      // Price
      const priceRaw =
        $(el).find('._30jeq3').text() ||
        $(el).find('._1_WHN1').text() ||
        '';
      const price = parseInrPrice(priceRaw);
      if (!price) return;

      // Link
      const href = $(el).find('a._1fQZEK, a.s1Q9rs, a._2rpwqI, a[href*="/p/"]').attr('href') || '';
      const url  = href ? `https://www.flipkart.com${href.split('?')[0]}` : '';

      const image = $(el).find('img._396cs4, img._2r_T1I').attr('src') || '';

      const ratingRaw = $(el).find('._3LWZlK').first().text().trim();
      const rating    = parseFloat(ratingRaw) || 0;

      const reviewsRaw = $(el).find('._2_R_DZ span').first().text().replace(/[^0-9]/g, '');
      const reviews    = parseInt(reviewsRaw, 10) || 0;

      results.push({
        id:       `flipkart-${results.length}`,
        name:     title,
        price,
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
