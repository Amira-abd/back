import Deal from '../models/Deal.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

/**
 * Generates pricing suggestions based on historical completed transactions
 * @param {string} categoryId - MongoDB ID of the category
 * @param {number} quantity - Quantity of the surplus
 * @returns {Promise<{minPrice: number, maxPrice: number, averagePrice: number}>}
 */
export const getPriceSuggestion = async (categoryId, quantity = 1) => {
  try {
    // 1. Locate all products listed under this category
    const products = await Product.find({ category_id: categoryId }).select('_id');
    const productIds = products.map(p => p._id);

    // 2. Fetch completed deals involving these products
    const historicalDeals = await Deal.find({
      product: { $in: productIds },
      status: 'completed',
      offeredPrice: { $gt: 0 }
    }).select('offeredPrice quantity');

    let prices = historicalDeals.map(d => d.offeredPrice);

    let averagePrice, minPrice, maxPrice;

    if (prices.length > 0) {
      // Analyze actual database transactions
      const sum = prices.reduce((acc, p) => acc + p, 0);
      averagePrice = sum / prices.length;
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    } else {
      // Fallback base prices based on category name if database has no records
      const category = await Category.findById(categoryId);
      const catName = category ? category.name.toLowerCase() : 'other';

      let baseAvg = 100; // default average
      if (catName.includes('plastic')) baseAvg = 135;
      else if (catName.includes('wood') || catName.includes('timber')) baseAvg = 210;
      else if (catName.includes('metal') || catName.includes('steel') || catName.includes('iron')) baseAvg = 460;
      else if (catName.includes('organic') || catName.includes('compost') || catName.includes('paper')) baseAvg = 55;
      else if (catName.includes('electronic') || catName.includes('e-waste')) baseAvg = 320;

      averagePrice = baseAvg;
      minPrice = baseAvg * 0.85;
      maxPrice = baseAvg * 1.15;
    }

    // Smart pricing: Apply volume discounts (economies of scale)
    // Bulk quantities (e.g. > 100 units) reduce unit price slightly
    let volumeMultiplier = 1.0;
    if (quantity > 1000) {
      volumeMultiplier = 0.8; // 20% discount
    } else if (quantity > 100) {
      volumeMultiplier = 0.9; // 10% discount
    } else if (quantity > 50) {
      volumeMultiplier = 0.95; // 5% discount
    }

    // Apply multiplier and round to 2 decimals
    averagePrice = Math.round(averagePrice * volumeMultiplier * 100) / 100;
    minPrice = Math.round(minPrice * volumeMultiplier * 100) / 100;
    maxPrice = Math.round(maxPrice * volumeMultiplier * 100) / 100;

    return {
      minPrice,
      maxPrice,
      averagePrice
    };
  } catch (error) {
    console.error('Error calculating price suggestions:', error.message);
    throw error;
  }
};

export default {
  getPriceSuggestion
};
