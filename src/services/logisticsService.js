/**
 * Logistics Service - Modular Estimators for Shipping Costs and Times
 */

class LogisticsProvider {
  constructor(name, baseRate, perKmRate, perKgRate, perM3Rate, speedDays) {
    this.name = name;
    this.baseRate = baseRate;
    this.perKmRate = perKmRate;
    this.perKgRate = perKgRate;
    this.perM3Rate = perM3Rate;
    this.speedDays = speedDays; // base days
  }

  calculate(weight, volume, distance) {
    // Basic billing logic:
    // Shipping Cost = Base Rate + (Distance * perKmRate) + (Weight * perKgRate) + (Volume * perM3Rate)
    const distanceCost = distance * this.perKmRate;
    const weightCost = weight * this.perKgRate;
    const volumeCost = volume * this.perM3Rate;
    const rawCost = this.baseRate + distanceCost + weightCost + volumeCost;
    
    // Ensure minimum pricing and round
    const cost = Math.max(this.baseRate, Math.round(rawCost * 100) / 100);
    
    // Estimate delivery time (days increases slightly with distance)
    const addedDays = Math.floor(distance / 500);
    const deliveryTime = `${this.speedDays + addedDays}-${this.speedDays + addedDays + 2} days`;
    
    return {
      provider: this.name,
      cost,
      deliveryTime
    };
  }
}

// Instantiate providers with specific coefficients
const providers = {
  dhl: new LogisticsProvider("DHL Express", 50.0, 0.15, 0.05, 1.2, 2),
  fedex: new LogisticsProvider("FedEx Priority", 40.0, 0.12, 0.04, 1.0, 3),
  ups: new LogisticsProvider("UPS Ground", 35.0, 0.10, 0.03, 0.9, 4),
  local: new LogisticsProvider("Local Freight", 20.0, 0.05, 0.015, 0.5, 6)
};

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
