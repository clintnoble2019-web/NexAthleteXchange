export const realMarket = {
  status: "COMING_SOON" as const,
  liveFundsEnabled: false,
  currency: "USD / USDC",
  network: "Solana",
  tradeFee: 2,
  deposits: ["Bank", "Debit card", "USDC on Solana"],
  withdrawals: ["Bank", "USDC on Solana"],
};

export function assertRealMarketDisabled() {
  if (realMarket.liveFundsEnabled) {
    throw new Error("Real Market live-funds functionality must remain disabled until launch approval.");
  }
}
