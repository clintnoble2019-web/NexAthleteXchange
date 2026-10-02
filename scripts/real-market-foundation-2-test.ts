import {
  RealFundingRail,
  RealFundingStatus,
  RealFundingType,
  RealMarketEnvironment,
  TradeSide,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { executeSandboxRealTrade, simulateSandboxFunding } from "../lib/real-market-sandbox";
import { realMarket } from "../lib/real-market";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const unique = Date.now();
const email = `real-market-${unique}@nexathletexchange.test`;
const username = `rm${String(unique).slice(-9)}`;

async function balance(userId: string) {
  const wallet = await prisma.realWallet.findUnique({
    where: { userId_environment: { userId, environment: RealMarketEnvironment.SANDBOX } },
  });
  return Number(wallet?.balance ?? 0);
}

async function main() {
  assert(realMarket.liveFundsEnabled === false, "Live funds must remain disabled.");
  assert(realMarket.environment === "SANDBOX", "Real Market must remain in sandbox mode.");

  const user = await prisma.user.create({
    data: { email, username, passwordHash: "sandbox-test-only", realEnrollment: { create: { status: "VERIFIED", environment: "SANDBOX", identityHash: `test-foundation2-${unique}` } } },
  });

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { active: true, marketEnabled: true, currentPrice: { gt: 5 } },
      orderBy: { currentPrice: "asc" },
    });
    assert(athlete, "Acceptance test needs a tradable athlete priced above $5.");

    const deposit = await simulateSandboxFunding(
      user.id,
      RealFundingType.DEPOSIT,
      RealFundingRail.BANK,
      100,
    );
    assert(deposit.funding.status === RealFundingStatus.COMPLETED, "Bank sandbox deposit did not complete.");
    assert((await balance(user.id)) === 100, "Sandbox wallet did not receive the $100 fake deposit.");

    const buy = await executeSandboxRealTrade(user.id, athlete.id, TradeSide.BUY, 1);
    const expectedAfterBuy = Number(athlete.currentPrice) + realMarket.tradeFee;
    assert(Math.abs(Number(buy.trade.netCashFlow) + expectedAfterBuy) < 0.001, "Buy cash flow did not include the flat fee.");
    assert(Math.abs((await balance(user.id)) - (100 - expectedAfterBuy)) < 0.001, "Buy did not debit price + $2 fee.");

    const position = await prisma.realPosition.findUnique({
      where: {
        userId_athleteId_environment: {
          userId: user.id,
          athleteId: athlete.id,
          environment: RealMarketEnvironment.SANDBOX,
        },
      },
    });
    assert(position && Number(position.quantity) === 1, "Sandbox position was not created.");
    assert(Math.abs(Number(position.averageCost) - expectedAfterBuy) < 0.001, "All-in average cost did not include the buy fee.");

    const sell = await executeSandboxRealTrade(user.id, athlete.id, TradeSide.SELL, 1);
    assert(Number(sell.trade.fee) === realMarket.tradeFee, "Sell did not record the $2 fee.");
    assert(Math.abs(Number(sell.trade.realizedPnl) + 4) < 0.001, "Round-trip P/L should equal two $2 fees at an unchanged price.");
    assert(Math.abs((await balance(user.id)) - 96) < 0.001, "Round-trip balance should be $96 after two $2 fees.");

    const closedPosition = await prisma.realPosition.findUnique({
      where: {
        userId_athleteId_environment: {
          userId: user.id,
          athleteId: athlete.id,
          environment: RealMarketEnvironment.SANDBOX,
        },
      },
    });
    assert(!closedPosition, "Sandbox position should close after selling the full quantity.");

    const bankWithdrawal = await simulateSandboxFunding(
      user.id,
      RealFundingType.WITHDRAWAL,
      RealFundingRail.BANK,
      25,
    );
    assert(bankWithdrawal.funding.status === RealFundingStatus.COMPLETED, "Bank sandbox withdrawal did not complete.");
    assert(Math.abs((await balance(user.id)) - 71) < 0.001, "Bank withdrawal did not debit the sandbox balance.");

    const failedWithdrawal = await simulateSandboxFunding(
      user.id,
      RealFundingType.WITHDRAWAL,
      RealFundingRail.BANK,
      1000,
    );
    assert(failedWithdrawal.funding.status === RealFundingStatus.FAILED, "Insufficient withdrawal should be FAILED.");
    assert(Math.abs((await balance(user.id)) - 71) < 0.001, "Failed withdrawal changed the wallet balance.");

    const usdcDeposit = await simulateSandboxFunding(
      user.id,
      RealFundingType.DEPOSIT,
      RealFundingRail.USDC_SOLANA,
      25,
    );
    assert(usdcDeposit.funding.status === RealFundingStatus.COMPLETED, "USDC Devnet-style deposit did not complete.");
    assert(usdcDeposit.funding.network === realMarket.sandboxNetwork, "USDC sandbox funding did not use the Devnet label.");
    assert((usdcDeposit.funding.providerRef || "").startsWith("solana-devnet-"), "USDC sandbox funding is missing its mock Devnet reference.");
    assert(Math.abs((await balance(user.id)) - 96) < 0.001, "USDC sandbox deposit did not credit the balance.");

    let debitWithdrawalRejected = false;
    try {
      await simulateSandboxFunding(user.id, RealFundingType.WITHDRAWAL, RealFundingRail.DEBIT_CARD, 10);
    } catch {
      debitWithdrawalRejected = true;
    }
    assert(debitWithdrawalRejected, "Debit-card withdrawals must be rejected.");

    const [realTrades, ledger, freeTrades, freePositions] = await Promise.all([
      prisma.realTrade.findMany({ where: { userId: user.id, environment: RealMarketEnvironment.SANDBOX } }),
      prisma.realLedgerEntry.findMany({ where: { userId: user.id, environment: RealMarketEnvironment.SANDBOX } }),
      prisma.trade.count({ where: { userId: user.id } }),
      prisma.position.count({ where: { userId: user.id } }),
    ]);

    assert(realTrades.length === 2, `Expected 2 sandbox trades, found ${realTrades.length}.`);
    assert(ledger.filter((entry) => entry.type === "TRADE_FEE").length === 2, "Expected one fee ledger entry per executed trade.");
    assert(freeTrades === 0 && freePositions === 0, "Sandbox Real Market activity leaked into the Free Market.");

    const lastLedger = await prisma.realLedgerEntry.findFirst({
      where: { userId: user.id, environment: RealMarketEnvironment.SANDBOX },
      orderBy: { createdAt: "desc" },
    });
    assert(lastLedger && Math.abs(Number(lastLedger.balance) - (await balance(user.id))) < 0.001, "Ledger does not reconcile to sandbox wallet balance.");

    console.log("Real Market Foundation 2 acceptance test: PASS");
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
