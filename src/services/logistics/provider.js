/**
 * Base Logistics Provider Class
 */
class LogisticsProvider {
  constructor(name, baseRate, perKmRate, perKgRate, perM3Rate, speedDays) {
    this.name = name;
    this.baseRate = baseRate;
    this.perKmRate = perKmRate;
    this.perKgRate = perKgRate;
    this.perM3Rate = perM3Rate;
    this.speedDays = speedDays;
  }

  calculate(weight, volume, distance) {
    const distanceCost = distance * this.perKmRate;
    const weightCost = weight * this.perKgRate;
    const volumeCost = volume * this.perM3Rate;
    const rawCost = this.baseRate + distanceCost + weightCost + volumeCost;
    
    const cost = Math.max(this.baseRate, Math.round(rawCost * 100) / 100);
    const addedDays = Math.floor(distance / 500);
    const deliveryTime = `${this.speedDays + addedDays}-${this.speedDays + addedDays + 2} days`;
    
    return {
      provider: this.name,
      cost,
      deliveryTime
    };
  }
}

export default LogisticsProvider;
