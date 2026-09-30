export const livePricingConfig = {
  maxMovePct: 0.12,
  minPrice: 1,
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function calculateBoundedTargetPrice(currentPrice: number, targetPrice: number, maxMovePct = livePricingConfig.maxMovePct) {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) throw new Error("Current price must be positive.");
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) throw new Error("Target price must be positive.");
  if (!Number.isFinite(maxMovePct) || maxMovePct < 0 || maxMovePct > 1) throw new Error("Max move must be between 0 and 1.");

  const floor = Math.max(livePricingConfig.minPrice, currentPrice * (1 - maxMovePct));
  const ceiling = currentPrice * (1 + maxMovePct);
  const bounded = Math.max(floor, Math.min(ceiling, targetPrice));
  return roundMoney(bounded);
}

export function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
