// utils/urlParser.js
// Parses a product URL to detect which platform it came from and extract
// a usable product name/search term — without any scraping.
//
// Strategy: read the URL path segments and query strings that every
// platform embeds in their public product URLs.

// ── Platform detection ────────────────────────────────────────────────────────

/**
 * Detect which e-commerce platform a URL belongs to.
 * Returns one of: 'Amazon' | 'Flipkart' | 'Etsy' | 'eBay' | 'Unknown'
 */
export const detectPlatform = (rawUrl) => {
  try {
    const { hostname } = new URL(rawUrl);
    const host = hostname.toLowerCase().replace(/^www\./, '');

    if (host.includes('amazon'))   return 'Amazon';
    if (host.includes('flipkart')) return 'Flipkart';
    if (host.includes('etsy'))     return 'Etsy';
    if (host.includes('ebay'))     return 'eBay';

    return 'Unknown';
  } catch {
    return 'Unknown';
  }
};

// ── Per-platform name extractors ──────────────────────────────────────────────

/**
 * Amazon URLs look like:
 *   /dp/B09G9HD6PD
 *   /Apple-iPhone-13-128GB-Midnight/dp/B09G9HD6PD
 *   /s?k=iphone+13
 *
 * We read the slug before /dp/ or the `k` query param for search pages.
 */
const extractFromAmazon = (url) => {
  const { pathname, searchParams } = url;

  // Search page: /s?k=iphone+13
  const kParam = searchParams.get('k') || searchParams.get('field-keywords');
  if (kParam) return decodeURIComponent(kParam).replace(/\+/g, ' ');

  // Product page: /Slug-Words-Here/dp/ASIN  or  /dp/ASIN
  const dpMatch = pathname.match(/\/([^/]+)\/dp\//);
  if (dpMatch && dpMatch[1] !== 'dp') {
    return slugToName(dpMatch[1]);
  }

  // Fallback: first meaningful path segment
  return firstPathSegment(pathname);
};

/**
 * Flipkart URLs look like:
 *   /apple-iphone-13-midnight-128-gb/p/itm...
 *   /search?q=iphone+13
 */
const extractFromFlipkart = (url) => {
  const { pathname, searchParams } = url;

  const q = searchParams.get('q');
  if (q) return decodeURIComponent(q).replace(/\+/g, ' ');

  // Product page: /product-name-here/p/ITEMID
  const pMatch = pathname.match(/^\/([^/]+)\/p\//);
  if (pMatch) return slugToName(pMatch[1]);

  return firstPathSegment(pathname);
};

/**
 * Etsy URLs look like:
 *   /listing/123456789/handmade-leather-iphone-case
 *   /search?q=iphone+case
 */
const extractFromEtsy = (url) => {
  const { pathname, searchParams } = url;

  const q = searchParams.get('q');
  if (q) return decodeURIComponent(q).replace(/\+/g, ' ');

  // /listing/ID/product-name-slug
  const listingMatch = pathname.match(/\/listing\/\d+\/([^/?]+)/);
  if (listingMatch) return slugToName(listingMatch[1]);

  return firstPathSegment(pathname);
};

/**
 * eBay URLs look like:
 *   /itm/Apple-iPhone-13-128GB/123456789
 *   /sch/i.html?_nkw=iphone+13
 */
const extractFromEbay = (url) => {
  const { pathname, searchParams } = url;

  const nkw = searchParams.get('_nkw');
  if (nkw) return decodeURIComponent(nkw).replace(/\+/g, ' ');

  // /itm/Product-Name-Slug/ITEMID
  const itmMatch = pathname.match(/\/itm\/([^/]+)/);
  if (itmMatch) return slugToName(itmMatch[1]);

  return firstPathSegment(pathname);
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a URL slug like "Apple-iPhone-13-128GB-Midnight" into
 * a readable name "Apple iPhone 13 128GB Midnight".
 * Also strips common noise tokens (dp, itm, listing, etc.).
 */
const NOISE_TOKENS = new Set(['dp', 'itm', 'listing', 'p', 'ref', 'sr', 'ie', 'utf8', 'qid']);

const slugToName = (slug) => {
  return slug
    .split(/[-_]/)
    .filter((t) => t.length > 0 && !NOISE_TOKENS.has(t.toLowerCase()) && !/^\d{6,}$/.test(t))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/** Grab the first non-empty path segment as a last-resort fallback. */
const firstPathSegment = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length ? slugToName(parts[0]) : '';
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Extract product info from a URL.
 *
 * @param {string} rawUrl
 * @returns {{ platform: string, name: string, originalUrl: string, isValid: boolean }}
 */
export const extractProductInfo = (rawUrl) => {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { platform: 'Unknown', name: '', originalUrl: rawUrl, isValid: false };
  }

  const platform = detectPlatform(rawUrl);

  let name = '';
  switch (platform) {
    case 'Amazon':   name = extractFromAmazon(url);   break;
    case 'Flipkart': name = extractFromFlipkart(url); break;
    case 'Etsy':     name = extractFromEtsy(url);     break;
    case 'eBay':     name = extractFromEbay(url);     break;
    default:         name = firstPathSegment(url.pathname);
  }

  // Clean up: collapse whitespace, title-case first letter
  name = name.replace(/\s+/g, ' ').trim();
  if (name) name = name.charAt(0).toUpperCase() + name.slice(1);

  return {
    platform,
    name:        name || 'Unknown Product',
    originalUrl: rawUrl,
    isValid:     platform !== 'Unknown' && name.length > 0,
  };
};
