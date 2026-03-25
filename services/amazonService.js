// services/amazonService.js
// Amazon product search service

const amazonService = {
  async search(query) {
    // Mock Amazon search results
    // In a real implementation, this would call Amazon's API
    const mockResults = [
      {
        id: 'amazon-1',
        title: `${query} - Premium Model`,
        price: Math.floor(Math.random() * 500) + 50,
        platform: 'Amazon',
        url: `https://amazon.com/search/${query}`,
        image: 'https://via.placeholder.com/150',
        rating: (Math.random() * 2 + 3).toFixed(1),
        reviews: Math.floor(Math.random() * 1000) + 10
      },
      {
        id: 'amazon-2',
        title: `${query} - Standard Edition`,
        price: Math.floor(Math.random() * 300) + 30,
        platform: 'Amazon',
        url: `https://amazon.com/search/${query}`,
        image: 'https://via.placeholder.com/150',
        rating: (Math.random() * 2 + 3).toFixed(1),
        reviews: Math.floor(Math.random() * 500) + 5
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return mockResults;
  }
};

export default amazonService;