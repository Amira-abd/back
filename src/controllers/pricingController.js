import { getPriceSuggestion } from '../services/priceSuggestionService.js';

/**
 * Handle GET request for price suggestion
 * @route GET /api/pricing/suggest
 */
export const getPricingSuggestion = async (req, res) => {
  try {
    const { category, quantity } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Missing parameter: category is required."
      });
    }

    const qty = quantity ? parseFloat(quantity) : 1;
    const suggestions = await getPriceSuggestion(category, qty);

    res.status(200).json({
      success: true,
      ...suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate price suggestion.",
      error: error.message
    });
  }
};
