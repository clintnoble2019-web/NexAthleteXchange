export const realMarket = {
  status: "COMING_SOON" as const,
  environment: "SANDBOX" as const,
  liveFundsEnabled: false,
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
  careerEndingRetirementDays: 7,
};

export function assertRealMarketDisabled() {
  if (realMarket.liveFundsEnabled) {
    throw new Error("Real Market live-funds functionality must remain disabled until launch approval.");
  }
}

export function assertRealMarketSandbox() {
  assertRealMarketDisabled();
  if (realMarket.environment !== "SANDBOX") {
    throw new Error("Real Market sandbox guard rejected a non-sandbox environment.");
  }
}

export function realMarketSandboxPreviewEnabled() {
  return process.env.NODE_ENV === "development" || process.env.REAL_MARKET_SANDBOX_PREVIEW === "1";
}

export function realMarketCustomerTestEnabled() {
  return realMarketSandboxPreviewEnabled() && process.env.REAL_MARKET_CUSTOMER_TEST === "1";
}
