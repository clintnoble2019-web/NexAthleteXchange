export const realMarket = {
  status: "COMING_SOON" as const,
  environment: "SANDBOX" as const,
  liveFundsEnabled: false,
  productType: "LIMITED_SUPPLY_DIGITAL_ATHLETE_COLLECTIBLES" as const,
  productName: "Digital Athlete Collectibles",
  tradingUnitName: "unit",
  referenceLabel: "Scout Value",
  marketPriceSource: "ORDER_BOOK" as const,
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
    total: 60,
    perSport: 20,
    sports: ["NBA", "NFL", "MLB"] as const,
    nflPositions: ["QB", "WR", "RB"] as const,
  },
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
