import { calculateAllEstimates } from '../services/logistics/index.js';

/**
 * Handle POST request for shipping estimates
 * @route POST /api/logistics/estimate
 */
export const getShippingEstimates = async (req, res) => {
  try {
    const { weight, volume, distance } = req.body;

    if (weight === undefined || volume === undefined || distance === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing parameter: weight, volume, and distance are required."
      });
    }

    const numericWeight = parseFloat(weight);
    const numericVolume = parseFloat(volume);
    const numericDistance = parseFloat(distance);

    if (isNaN(numericWeight) || isNaN(numericVolume) || isNaN(numericDistance)) {
      return res.status(400).json({
        success: false,
        message: "Parameters weight, volume, and distance must be valid numbers."
      });
    }

    const estimates = calculateAllEstimates(numericWeight, numericVolume, numericDistance);

    res.status(200).json({
      success: true,
      estimates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to calculate shipping estimates.",
      error: error.message
    });
  }
};
