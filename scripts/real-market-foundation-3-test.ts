import {
  LiquidityQuoteSide,
  LiquidityQuoteStatus,
  PrismaClient,
  RealInstrumentStatus,
  RealMarketEnvironment,
  Sport,
  TradeSide,
} from "@prisma/client";
import {
  authenticateSandboxLiquidityProvider,
  beginSandboxCareerEndingRetirement,
  createSandboxLiquidityProvider,
  executeSandboxLiquidityBackedTrade,
  fundSandboxSettlementReserve,
  getSandboxTopOfBook,
  setSandboxProviderInventory,
  settleExpiredSandboxRetirements,
  submitSandboxLiquidityQuote,
  syncSandboxRealMarketUniverse,
} from "../lib/liquidity-provider-sandbox";

const prisma = new PrismaClient();
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ensureCandidates() {
  const sports = [Sport.NBA, Sport.NFL, Sport.MLB];
  for (const sport of sports) {
    for (let index = 1; index <= 21; index += 1) {
      const position = sport === Sport.NFL
        ? (["QB", "WR", "RB"] as const)[(index - 1) % 3]
        : sport === Sport.NBA
          ? (["G", "F", "C"] as const)[(index - 1) % 3]
          : (["SP", "RP", "C", "1B", "2B", "3B", "SS", "OF", "DH"] as const)[(index - 1) % 9];
      await prisma.athlete.upsert({
        where: { slug: `rmf3-${sport.toLowerCase()}-${index}` },
        update: {
          active: true,
          marketEnabled: true,
          position,
          currentPrice: 25 + index,
          previousPrice: 24 + index,
          marketCap: 100000 - index,
        },
        create: {
          name: `RMF3 ${sport} Athlete ${index}`,
          slug: `rmf3-${sport.toLowerCase()}-${index}`,
          sport,
          league: String(sport),
          team: `T${String(index).padStart(2, "0")}`,
          position,
          currentPrice: 25 + index,
          previousPrice: 24 + index,
          performance: 80,
          marketCap: 100000 - index,
          active: true,
          marketEnabled: true,
        },
      });
    }
  }
}

async function main() {
  await ensureCandidates();

  const universe = await syncSandboxRealMarketUniverse();
  assert(universe.NBA === 20, `Expected 20 NBA Real Market instruments, got ${universe.NBA}`);
  assert(universe.NFL === 20, `Expected 20 NFL Real Market instruments, got ${universe.NFL}`);
  assert(universe.MLB === 20, `Expected 20 MLB Real Market instruments, got ${universe.MLB}`);

  const nflInvalid = await prisma.realMarketInstrument.count({
    where: {
      environment: RealMarketEnvironment.SANDBOX,
      athlete: { sport: Sport.NFL, position: { notIn: ["QB", "WR", "RB"] } },
      status: { not: RealInstrumentStatus.RETIRED },
    },
  });
  assert(nflInvalid === 0, "NFL Real Market universe included a position outside QB/WR/RB.");

  const unique = Date.now();
  const { provider, apiKey } = await createSandboxLiquidityProvider({
    code: `TEST${String(unique).slice(-8)}`,
    name: "Foundation 3 Test LP",
    initialCash: 100000,
    minQuoteDepth: 10,
    maxSpreadBps: 500,
    maxGrossExposure: 100000,
    maxPerAthleteExposure: 25000,
    quoteTtlSeconds: 300,
  });
  const authenticated = await authenticateSandboxLiquidityProvider(apiKey);
  assert(authenticated.id === provider.id, "LP API key authentication failed.");
  assert(Number(provider.makerFee) === 0, "LP maker fee must be zero in the sandbox mandate.");

  const instrument = await prisma.realMarketInstrument.findFirst({
    where: { environment: RealMarketEnvironment.SANDBOX, status: RealInstrumentStatus.ACTIVE, athlete: { sport: Sport.NBA } },
    include: { athlete: true },
    orderBy: { launchRank: "asc" },
  });
  assert(instrument, "Could not find an active NBA Real Market instrument.");

  await setSandboxProviderInventory(provider.id, instrument.id, 100);
  const reference = Number(instrument.referencePrice);
  const bidPrice = (reference * 0.99).toFixed(4);
  const askPrice = (reference * 1.01).toFixed(4);

  await submitSandboxLiquidityQuote({ providerId: provider.id, instrumentId: instrument.id, side: LiquidityQuoteSide.BID, price: bidPrice, quantity: 10 });
  await submitSandboxLiquidityQuote({ providerId: provider.id, instrumentId: instrument.id, side: LiquidityQuoteSide.ASK, price: askPrice, quantity: 10 });
  const book = await getSandboxTopOfBook(instrument.id);
  assert(book.bid && Number(book.bid.price) === Number(bidPrice), "Best bid did not match LP quote.");
  assert(book.ask && Number(book.ask.price) === Number(askPrice), "Best ask did not match LP quote.");

  const user = await prisma.user.create({
    data: {
      username: `rmf3user${String(unique).slice(-7)}`,
      email: `rmf3-${unique}@example.test`,
      passwordHash: "sandbox-only-test-hash",
      realWallets: { create: { environment: RealMarketEnvironment.SANDBOX, currency: "USD", balance: 1000 } },
    },
  });

  const providerWalletBefore = await prisma.liquidityProviderWallet.findUniqueOrThrow({ where: { providerId: provider.id } });
  const inventoryBefore = await prisma.liquidityProviderInventory.findUniqueOrThrow({ where: { providerId_instrumentId: { providerId: provider.id, instrumentId: instrument.id } } });
  const execution = await executeSandboxLiquidityBackedTrade(user.id, instrument.athleteId, TradeSide.BUY, 1);
  assert(Number(execution.trade.fee) === 2, "Retail LP-backed execution did not charge the $2 fee.");
  assert(Number(execution.trade.price) === Number(askPrice), "Customer buy did not execute against the best ask.");

  const providerWalletAfter = await prisma.liquidityProviderWallet.findUniqueOrThrow({ where: { providerId: provider.id } });
  const inventoryAfter = await prisma.liquidityProviderInventory.findUniqueOrThrow({ where: { providerId_instrumentId: { providerId: provider.id, instrumentId: instrument.id } } });
  assert(Number(providerWalletAfter.balance) > Number(providerWalletBefore.balance), "LP cash did not increase after selling inventory.");
  assert(Number(inventoryAfter.quantity) === Number(inventoryBefore.quantity) - 1, "LP inventory did not decrease after customer buy.");

  const retirement = await beginSandboxCareerEndingRetirement(instrument.athleteId, "Verified career-ending injury test");
  assert(retirement.status === RealInstrumentStatus.RETIRING, "Instrument did not enter RETIRING state.");
  assert(Number(retirement.frozenSettlementPrice) === reference, "Career-ending settlement price did not freeze at the reference price.");
  const activeQuotesAfterRetirement = await prisma.liquidityQuote.count({ where: { instrumentId: instrument.id, status: LiquidityQuoteStatus.ACTIVE } });
  assert(activeQuotesAfterRetirement === 0, "Retirement did not cancel active LP quotes.");

  await fundSandboxSettlementReserve(100000);
  await prisma.realMarketInstrument.update({ where: { id: instrument.id }, data: { retirementDeadline: new Date(Date.now() - 1000) } });
  const settled = await settleExpiredSandboxRetirements();
  assert(settled.includes(instrument.id), "Expired retirement was not automatically settled.");

  const retired = await prisma.realMarketInstrument.findUniqueOrThrow({ where: { id: instrument.id } });
  assert(retired.status === RealInstrumentStatus.RETIRED, "Instrument did not finish in RETIRED state.");
  const remainingPosition = await prisma.realPosition.findUnique({
    where: { userId_athleteId_environment: { userId: user.id, athleteId: instrument.athleteId, environment: RealMarketEnvironment.SANDBOX } },
  });
  assert(!remainingPosition, "Automatic retirement settlement did not close the customer holding.");
  const settlementEvent = await prisma.realSettlementEvent.findFirst({ where: { instrumentId: instrument.id } });
  assert(settlementEvent && settlementEvent.holders === 1, "Settlement reserve event was not recorded.");

  const nbaActiveAfterReplacement = await prisma.realMarketInstrument.count({
    where: { environment: RealMarketEnvironment.SANDBOX, athlete: { sport: Sport.NBA }, status: { not: RealInstrumentStatus.RETIRED } },
  });
  assert(nbaActiveAfterReplacement === 20, `Replacement policy did not restore NBA universe to 20; got ${nbaActiveAfterReplacement}`);

  const liveInstrumentCount = await prisma.realMarketInstrument.count({ where: { environment: RealMarketEnvironment.LIVE } });
  const liveProviderCount = await prisma.liquidityProvider.count({ where: { environment: RealMarketEnvironment.LIVE } });
  assert(liveInstrumentCount === 0 && liveProviderCount === 0, "Foundation 3 created LIVE liquidity records.");

  console.log("Real Market Foundation 3 institutional liquidity test: PASS");
}

main().finally(() => prisma.$disconnect());
