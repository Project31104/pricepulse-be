// services/ebayService.js
// eBay product search service

const ebayService = {
  async search(query) {
    // Mock eBay search results
    // In a real implementation, this would call eBay's API
    const mockResults = [
      {
        id: 'ebay-1',
        title: `${query} - New Condition`,
        price: Math.floor(Math.random() * 400) + 40,
        platform: 'eBay',
        url: `https://ebay.com/search/${query}`,
        image: 'https://via.placeholder.com/150',
        rating: (Math.random() * 2 + 3).toFixed(1),
        reviews: Math.floor(Math.random() * 200) + 1,
        condition: 'New'
      },
      {
        id: 'ebay-2',
        title: `${query} - Used - Good Condition`,
        price: Math.floor(Math.random() * 250) + 20,
        platform: 'eBay',
        url: `https://ebay.com/search/${query}`,
        image: 'https://via.placeholder.com/150',
        rating: (Math.random() * 2 + 3).toFixed(1),
        reviews: Math.floor(Math.random() * 100) + 1,
        condition: 'Used'
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return mockResults;
  }
};

export default ebayService;