export const realMarket = {
  status: "COMING_SOON" as const,
  environment: "SANDBOX" as const,
  liveFundsEnabled: false,
  productType: "LIMITED_SUPPLY_DIGITAL_ATHLETE_COLLECTIBLES" as const,
  productName: "Digital Athlete Collectibles",
  tradingUnitName: "unit",
  referenceLabel: "Scout Value",
  // Executable Real Market prices still come from customer/House bids, asks, and fills.
  marketPriceSource: "ORDER_BOOK" as const,
  // Temporary test bridge only: center each sandbox athlete's reference/House market around
  // the athlete's current Free Market price. This is intentionally not the long-term pricing model.
  referencePriceSource: "FREE_MARKET_CURRENT_PRICE_TEMPORARY" as const,
  referencePriceBridgeTemporary: true,
  performanceCreatesCashEntitlement: false,
  guaranteedProfit: false,
  guaranteedBuyer: false,
  guaranteedRedemption: false,
  minimumAge: 18,
  oneVerifiedAccountPerPerson: true,
  currency: "USD / USDC",
  network: "Solana",
  sandboxNetwork: "Solana Devnet",
  cryptoAsset: "USDC",
  tradeFee: 2,
  liquidityProviderMakerFee: 0,
  deposits: ["Bank", "Debit card", "USDC on Solana"],
  withdrawals: ["Bank", "USDC on Solana"],
  launchUniverse: {
    total: 72,
    perSport: 24,
    sports: ["NBA", "NFL", "MLB"] as const,
    nflPositions: ["QB", "WR", "RB"] as const,
  },
  // Legacy simulator behavior only. The planned live collectible product has no guaranteed redemption.
  careerEndingRetirementDays: 7,
};

export function assertRealMarketDisabled() {
  if (realMarket.liveFundsEnabled) {
    throw new Error("Real Market live-funds functionality must remain disabled until production identity, sanctions, location, custody/payment, market-surveillance, and withdrawal controls are enabled and reviewed.");
  }
}

export function assertRealMarketSandbox() {
  assertRealMarketDisabled();
  if (realMarket.environment !== "SANDBOX") throw new Error("Real Market sandbox guard rejected a non-sandbox environment.");
}

export function realMarketSandboxPreviewEnabled() {
  return process.env.NODE_ENV === "development" || process.env.REAL_MARKET_SANDBOX_PREVIEW === "1";
}

export function realMarketCustomerTestEnabled() {
  return realMarketSandboxPreviewEnabled() && process.env.REAL_MARKET_CUSTOMER_TEST === "1";
}

export function realMarketLiveComplianceConfigured() {
  return process.env.REAL_MARKET_LIVE_APPROVED === "1" &&
    process.env.REAL_MARKET_KYC_PROVIDER_ENABLED === "1" &&
    process.env.REAL_MARKET_SANCTIONS_SCREENING_ENABLED === "1" &&
    process.env.REAL_MARKET_GEOLOCATION_ENABLED === "1" &&
    process.env.REAL_MARKET_PAYMENT_CUSTODY_PROVIDER_ENABLED === "1" &&
    Boolean(process.env.REAL_MARKET_ALLOWED_REGIONS?.trim());
}
