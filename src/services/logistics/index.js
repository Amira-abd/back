import dhl from './dhl.js';
import ups from './ups.js';
import fedex from './fedex.js';
import local from './local.js';

const providers = { dhl, ups, fedex, local };

/**
 * Calculates shipping estimates across all providers
 * @param {number} weight - Weight in kilograms
 * @param {number} volume - Volume in cubic meters
 * @param {number} distance - Distance in kilometers
 * @returns {object} Provider estimates mapping
 */
export const calculateAllEstimates = (weight = 0, volume = 0, distance = 0) => {
  const estimates = {};
  for (const [key, provider] of Object.entries(providers)) {
    estimates[key] = provider.calculate(weight, volume, distance);
  }
  return estimates;
};

export default {
  calculateAllEstimates
};
