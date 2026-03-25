// services/comparisonService.js
// Handles product search across multiple e-commerce platforms.
// Caches results and manages search history.

import amazonService from './amazonService.js';
import ebayService from './ebayService.js';
import SearchHistory from '../models/SearchHistory.js';

class ComparisonService {
  async search(query, userId = null) {
    try {
      // Search across all platforms
      const [amazonResults, ebayResults] = await Promise.allSettled([
        amazonService.search(query),
        ebayService.search(query)
      ]);

      // Combine and normalize results
      const products = [
        ...(amazonResults.status === 'fulfilled' ? amazonResults.value : []),
        ...(ebayResults.status === 'fulfilled' ? ebayResults.value : [])
      ];

      // Sort by price (ascending)
      products.sort((a, b) => a.price - b.price);

      // Save search history if user is logged in
      if (userId) {
        await SearchHistory.create({
          user: userId,
          query,
          resultCount: products.length
        });
      }

      return {
        products: products.slice(0, 20), // Limit to 20 results
        meta: {
          total: products.length,
          query,
          platforms: ['Amazon', 'eBay']
        }
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        products: [],
        meta: { total: 0, query, error: error.message }
      };
    }
  }
}

const comparisonService = new ComparisonService();
export default comparisonService;