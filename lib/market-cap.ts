export const marketCapConfig = {
  performanceValueMultiplier: 100,
  minMarketCap: 0,
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function gamePerformanceValue(referencePrice: number, liveImpact: number) {
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new Error("Reference price must be positive.");
  }
  if (!Number.isFinite(liveImpact) || liveImpact < -1 || liveImpact > 1) {
    throw new Error("Live impact must be between -1 and 1.");
  }

  return roundMoney(referencePrice * liveImpact * marketCapConfig.performanceValueMultiplier);
}

export function lifetimePerformanceMarketCap(values: number[]) {
  const total = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  return Math.max(marketCapConfig.minMarketCap, roundMoney(total));
}
