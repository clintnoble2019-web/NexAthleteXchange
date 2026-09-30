import { createHash, randomBytes } from "node:crypto";
import {
  LiquidityProviderStatus,
  LiquidityQuoteSide,
  LiquidityQuoteStatus,
  Prisma,
  RealInstrumentStatus,
  RealLedgerType,
  RealMarketEnvironment,
  Sport,
  TradeSide,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertRealMarketSandbox, realMarket } from "@/lib/real-market";

const SANDBOX = RealMarketEnvironment.SANDBOX;
const TRADE_FEE = new Prisma.Decimal(String(realMarket.tradeFee));
const ZERO = new Prisma.Decimal(0);
const MIN_QUANTITY = new Prisma.Decimal("0.01");

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function positiveDecimal(value: number | string, label: string, places = 4) {
  const result = new Prisma.Decimal(String(value));
  if (!result.isFinite() || result.lte(0)) throw new Error(`${label} must be greater than zero.`);
  return result.toDecimalPlaces(places);
}

function eligiblePosition(sport: Sport) {
  if (sport !== Sport.NFL) return undefined;
  return { in: [...realMarket.launchUniverse.nflPositions] };
}

async function addNextEligibleInstrument(sport: Sport) {
  const activeCount = await prisma.realMarketInstrument.count({
    where: { environment: SANDBOX, athlete: { sport }, status: { not: RealInstrumentStatus.RETIRED } },
  });
  if (activeCount >= realMarket.launchUniverse.perSport) return null;

  const existing = await prisma.realMarketInstrument.findMany({
    where: { environment: SANDBOX, athlete: { sport } },
    select: { athleteId: true },
  });

  const athlete = await prisma.athlete.findFirst({
    where: {
      sport,
      active: true,
      marketEnabled: true,
      id: { notIn: existing.map((item) => item.athleteId) },
      ...(sport === Sport.NFL ? { position: eligiblePosition(sport) } : {}),
    },
    orderBy: [{ marketCap: "desc" }, { currentPrice: "desc" }, { name: "asc" }],
  });
  if (!athlete) return null;

  return prisma.realMarketInstrument.create({
    data: {
      athleteId: athlete.id,
      environment: SANDBOX,
      status: RealInstrumentStatus.ACTIVE,
      referencePrice: athlete.currentPrice,
      launchRank: activeCount + 1,
    },
    include: { athlete: true },
  });
}

export async function syncSandboxRealMarketUniverse() {
  assertRealMarketSandbox();
  const result: Record<string, number> = {};
  for (const sport of [Sport.NBA, Sport.NFL, Sport.MLB]) {
    while (await prisma.realMarketInstrument.count({
      where: { environment: SANDBOX, athlete: { sport }, status: { not: RealInstrumentStatus.RETIRED } },
    }) < realMarket.launchUniverse.perSport) {
      const created = await addNextEligibleInstrument(sport);
      if (!created) break;
    }

    const active = await prisma.realMarketInstrument.findMany({
      where: { environment: SANDBOX, athlete: { sport }, status: RealInstrumentStatus.ACTIVE },
      include: { athlete: true },
    });
    for (const instrument of active) {
      await prisma.realMarketInstrument.update({
        where: { id: instrument.id },
        data: { referencePrice: instrument.athlete.currentPrice },
      });
    }
    result[String(sport)] = await prisma.realMarketInstrument.count({
      where: { environment: SANDBOX, athlete: { sport }, status: { not: RealInstrumentStatus.RETIRED } },
    });
  }
  return result;
}

export async function createSandboxLiquidityProvider(input: {
  code: string;
  name: string;
  initialCash?: number | string;
  ipAllowlist?: string[];
  maxSpreadBps?: number;
  minQuoteDepth?: number | string;
  maxGrossExposure?: number | string;
  maxPerAthleteExposure?: number | string;
  quoteTtlSeconds?: number;
}) {
  assertRealMarketSandbox();
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) throw new Error("LP code must use 2-32 letters, numbers, dashes, or underscores.");
  if (name.length < 2 || name.length > 80) throw new Error("LP name must be 2-80 characters.");

  const secret = `nax_lp_${randomBytes(24).toString("hex")}`;
  const keyHash = sha256(secret);
  const keyPrefix = secret.slice(0, 15);
  const initialCash = new Prisma.Decimal(String(input.initialCash ?? 0)).toDecimalPlaces(2);
  if (initialCash.lt(0)) throw new Error("Initial LP cash cannot be negative.");

  const provider = await prisma.liquidityProvider.create({
    data: {
      code,
      name,
      environment: SANDBOX,
      status: LiquidityProviderStatus.SANDBOX_ACTIVE,
      makerFee: realMarket.liquidityProviderMakerFee,
      maxSpreadBps: input.maxSpreadBps ?? 500,
      minQuoteDepth: input.minQuoteDepth ?? 100,
      maxGrossExposure: input.maxGrossExposure ?? 100000,
      maxPerAthleteExposure: input.maxPerAthleteExposure ?? 10000,
      quoteTtlSeconds: input.quoteTtlSeconds ?? 30,
      wallet: { create: { balance: initialCash } },
      apiKeys: {
        create: {
          keyPrefix,
          keyHash,
          ipAllowlist: input.ipAllowlist ?? [],
        },
      },
    },
    include: { wallet: true },
  });

  return { provider, apiKey: secret, keyPrefix };
}

export async function authenticateSandboxLiquidityProvider(apiKey: string, sourceIp?: string | null) {
  assertRealMarketSandbox();
  const keyHash = sha256(apiKey.trim());
  const key = await prisma.liquidityProviderApiKey.findUnique({
    where: { keyHash },
    include: { provider: true },
  });
  if (!key || key.revokedAt) throw new Error("Invalid liquidity-provider API key.");
  if (key.provider.environment !== SANDBOX || key.provider.status !== LiquidityProviderStatus.SANDBOX_ACTIVE) {
    throw new Error("Liquidity-provider account is not active in sandbox.");
  }
  if (key.ipAllowlist.length > 0 && (!sourceIp || !key.ipAllowlist.includes(sourceIp))) {
    throw new Error("Source IP is not allowlisted for this liquidity provider.");
  }
  return key.provider;
}

export async function recordSandboxLiquidityHeartbeat(providerId: string) {
  assertRealMarketSandbox();
  return prisma.liquidityProvider.update({ where: { id: providerId }, data: { lastHeartbeatAt: new Date() } });
}

export async function setSandboxProviderInventory(providerId: string, instrumentId: string, quantityInput: number | string) {
  assertRealMarketSandbox();
  const quantity = new Prisma.Decimal(String(quantityInput)).toDecimalPlaces(4);
  if (!quantity.isFinite() || quantity.lt(0)) throw new Error("Inventory quantity cannot be negative.");
  return prisma.liquidityProviderInventory.upsert({
    where: { providerId_instrumentId: { providerId, instrumentId } },
    create: { providerId, instrumentId, quantity },
    update: { quantity },
  });
}

async function expireStaleQuotes() {
  await prisma.liquidityQuote.updateMany({
    where: { status: LiquidityQuoteStatus.ACTIVE, expiresAt: { lte: new Date() } },
    data: { status: LiquidityQuoteStatus.EXPIRED },
  });
}

export async function submitSandboxLiquidityQuote(input: {
  providerId: string;
  instrumentId: string;
  side: LiquidityQuoteSide;
  price: number | string;
  quantity: number | string;
}) {
  assertRealMarketSandbox();
  await expireStaleQuotes();
  const price = positiveDecimal(input.price, "Quote price");
  const quantity = positiveDecimal(input.quantity, "Quote quantity");
  if (quantity.lt(MIN_QUANTITY)) throw new Error("Minimum quote quantity is 0.01 units.");

  const [provider, instrument, wallet, inventory, existingQuotes] = await Promise.all([
    prisma.liquidityProvider.findUnique({ where: { id: input.providerId } }),
    prisma.realMarketInstrument.findUnique({ where: { id: input.instrumentId }, include: { athlete: true } }),
    prisma.liquidityProviderWallet.findUnique({ where: { providerId: input.providerId } }),
    prisma.liquidityProviderInventory.findUnique({
      where: { providerId_instrumentId: { providerId: input.providerId, instrumentId: input.instrumentId } },
    }),
    prisma.liquidityQuote.findMany({
      where: { providerId: input.providerId, status: LiquidityQuoteStatus.ACTIVE, expiresAt: { gt: new Date() } },
    }),
  ]);

  if (!provider || provider.status !== LiquidityProviderStatus.SANDBOX_ACTIVE || provider.environment !== SANDBOX) {
    throw new Error("Liquidity provider is not active in sandbox.");
  }
  if (!instrument || instrument.environment !== SANDBOX || instrument.status !== RealInstrumentStatus.ACTIVE) {
    throw new Error("Instrument is not open for liquidity quotes.");
  }
  if (!wallet) throw new Error("Liquidity-provider wallet not found.");

  const reference = instrument.referencePrice;
  if (input.side === LiquidityQuoteSide.BID && price.gt(reference)) throw new Error("Sandbox bid cannot exceed the reference price.");
  if (input.side === LiquidityQuoteSide.ASK && price.lt(reference)) throw new Error("Sandbox ask cannot be below the reference price.");
  const deviationBps = price.sub(reference).abs().div(reference).mul(10000);
  if (deviationBps.gt(provider.maxSpreadBps)) throw new Error(`Quote exceeds the provider ${provider.maxSpreadBps} bps reference-price limit.`);

  const notional = price.mul(quantity).toDecimalPlaces(2);
  if (notional.lt(provider.minQuoteDepth)) throw new Error(`Quote depth must be at least $${Number(provider.minQuoteDepth).toFixed(2)}.`);

  const otherQuotes = existingQuotes.filter((quote) => !(quote.instrumentId === input.instrumentId && quote.side === input.side));
  const grossCommitment = otherQuotes.reduce((sum, quote) => sum.add(quote.price.mul(quote.remaining)), ZERO).add(notional);
  if (grossCommitment.gt(provider.maxGrossExposure)) throw new Error("Quote would exceed provider gross exposure limit.");

  const athleteCommitment = otherQuotes
    .filter((quote) => quote.instrumentId === input.instrumentId)
    .reduce((sum, quote) => sum.add(quote.price.mul(quote.remaining)), ZERO)
    .add(notional);
  if (athleteCommitment.gt(provider.maxPerAthleteExposure)) throw new Error("Quote would exceed per-athlete exposure limit.");

  if (input.side === LiquidityQuoteSide.BID) {
    const bidCommitment = otherQuotes
      .filter((quote) => quote.side === LiquidityQuoteSide.BID)
      .reduce((sum, quote) => sum.add(quote.price.mul(quote.remaining)), ZERO)
      .add(notional);
    if (wallet.balance.lt(bidCommitment)) throw new Error("Insufficient LP sandbox cash for bid commitments.");
  } else {
    const askUnits = otherQuotes
      .filter((quote) => quote.side === LiquidityQuoteSide.ASK && quote.instrumentId === input.instrumentId)
      .reduce((sum, quote) => sum.add(quote.remaining), ZERO)
      .add(quantity);
    if (!inventory || inventory.quantity.lt(askUnits)) throw new Error("Insufficient LP sandbox inventory for ask quote.");
  }

  const expiresAt = new Date(Date.now() + provider.quoteTtlSeconds * 1000);
  return prisma.liquidityQuote.upsert({
    where: { providerId_instrumentId_side: { providerId: input.providerId, instrumentId: input.instrumentId, side: input.side } },
    create: {
      providerId: input.providerId,
      instrumentId: input.instrumentId,
      side: input.side,
      price,
      quantity,
      remaining: quantity,
      status: LiquidityQuoteStatus.ACTIVE,
      expiresAt,
    },
    update: { price, quantity, remaining: quantity, status: LiquidityQuoteStatus.ACTIVE, expiresAt },
  });
}

export async function cancelSandboxLiquidityQuote(providerId: string, instrumentId: string, side: LiquidityQuoteSide) {
  assertRealMarketSandbox();
  return prisma.liquidityQuote.updateMany({
    where: { providerId, instrumentId, side, status: LiquidityQuoteStatus.ACTIVE },
    data: { status: LiquidityQuoteStatus.CANCELLED, remaining: 0 },
  });
}

export async function cancelAllSandboxProviderQuotes(providerId: string) {
  assertRealMarketSandbox();
  return prisma.liquidityQuote.updateMany({
    where: { providerId, status: LiquidityQuoteStatus.ACTIVE },
    data: { status: LiquidityQuoteStatus.CANCELLED, remaining: 0 },
  });
}

export async function getSandboxTopOfBook(instrumentId: string) {
  assertRealMarketSandbox();
  await expireStaleQuotes();
  const now = new Date();
  const [bid, ask] = await Promise.all([
    prisma.liquidityQuote.findFirst({
      where: { instrumentId, side: LiquidityQuoteSide.BID, status: LiquidityQuoteStatus.ACTIVE, expiresAt: { gt: now }, remaining: { gt: 0 } },
      orderBy: [{ price: "desc" }, { updatedAt: "asc" }],
      include: { provider: { select: { code: true, name: true } } },
    }),
    prisma.liquidityQuote.findFirst({
      where: { instrumentId, side: LiquidityQuoteSide.ASK, status: LiquidityQuoteStatus.ACTIVE, expiresAt: { gt: now }, remaining: { gt: 0 } },
      orderBy: [{ price: "asc" }, { updatedAt: "asc" }],
      include: { provider: { select: { code: true, name: true } } },
    }),
  ]);
  return { bid, ask };
}

export async function getSandboxLiquidityProviderSnapshot(providerId: string) {
  assertRealMarketSandbox();
  await expireStaleQuotes();
  const provider = await prisma.liquidityProvider.findUnique({
    where: { id: providerId },
    include: {
      wallet: true,
      inventory: { include: { instrument: { include: { athlete: true } } } },
      quotes: { where: { status: LiquidityQuoteStatus.ACTIVE, expiresAt: { gt: new Date() } }, include: { instrument: { include: { athlete: true } } } },
    },
  });
  if (!provider) throw new Error("Liquidity provider not found.");
  const inventoryValue = provider.inventory.reduce((sum, item) => sum + Number(item.quantity) * Number(item.instrument.referencePrice), 0);
  const quotedNotional = provider.quotes.reduce((sum, quote) => sum + Number(quote.remaining) * Number(quote.price), 0);
  return { provider, inventoryValue, quotedNotional };
}

export async function executeSandboxLiquidityBackedTrade(
  userId: string,
  athleteId: string,
  side: TradeSide,
  quantityInput: number,
) {
  assertRealMarketSandbox();
  const quantity = positiveDecimal(quantityInput, "Quantity");
  if (quantity.lt(MIN_QUANTITY)) throw new Error("Minimum trade quantity is 0.01 units.");

  const instrument = await prisma.realMarketInstrument.findUnique({
    where: { athleteId_environment: { athleteId, environment: SANDBOX } },
  });
  if (!instrument || instrument.status !== RealInstrumentStatus.ACTIVE) throw new Error("Athlete is not open in the Real Market sandbox.");

  const book = await getSandboxTopOfBook(instrument.id);
  const quote = side === TradeSide.BUY ? book.ask : book.bid;
  if (!quote || quote.remaining.lt(quantity)) throw new Error("Not enough LP sandbox liquidity is available for this trade.");

  return prisma.$transaction(async (tx) => {
    const currentQuote = await tx.liquidityQuote.findUnique({ where: { id: quote.id } });
    if (!currentQuote || currentQuote.status !== LiquidityQuoteStatus.ACTIVE || currentQuote.expiresAt <= new Date() || currentQuote.remaining.lt(quantity)) {
      throw new Error("Liquidity quote changed before execution. Try again.");
    }

    const [wallet, position, providerWallet, inventory] = await Promise.all([
      tx.realWallet.upsert({
        where: { userId_environment: { userId, environment: SANDBOX } },
        create: { userId, environment: SANDBOX, currency: "USD", balance: 0 },
        update: {},
      }),
      tx.realPosition.findUnique({ where: { userId_athleteId_environment: { userId, athleteId, environment: SANDBOX } } }),
      tx.liquidityProviderWallet.findUnique({ where: { providerId: currentQuote.providerId } }),
      tx.liquidityProviderInventory.findUnique({ where: { providerId_instrumentId: { providerId: currentQuote.providerId, instrumentId: instrument.id } } }),
    ]);
    if (!providerWallet) throw new Error("LP wallet is unavailable.");

    const price = currentQuote.price;
    const gross = price.mul(quantity).toDecimalPlaces(2);
    let trade;
    let finalBalance;
    let providerCashFlow;

    if (side === TradeSide.BUY) {
      const totalDebit = gross.add(TRADE_FEE);
      if (wallet.balance.lt(totalDebit)) throw new Error("Insufficient sandbox USD balance.");
      if (!inventory || inventory.quantity.lt(quantity)) throw new Error("LP inventory changed before execution.");

      const oldQty = position?.quantity ?? ZERO;
      const oldAllInCost = position ? position.averageCost.mul(oldQty) : ZERO;
      const newQty = oldQty.add(quantity);
      const averageCost = oldAllInCost.add(totalDebit).div(newQty).toDecimalPlaces(4);
      const afterTrade = wallet.balance.sub(gross);
      finalBalance = afterTrade.sub(TRADE_FEE);
      providerCashFlow = gross;

      await tx.realWallet.update({ where: { id: wallet.id }, data: { balance: finalBalance } });
      await tx.realPosition.upsert({
        where: { userId_athleteId_environment: { userId, athleteId, environment: SANDBOX } },
        create: { userId, athleteId, environment: SANDBOX, quantity, averageCost },
        update: { quantity: newQty, averageCost },
      });
      await tx.liquidityProviderWallet.update({ where: { id: providerWallet.id }, data: { balance: providerWallet.balance.add(gross) } });
      await tx.liquidityProviderInventory.update({ where: { id: inventory.id }, data: { quantity: inventory.quantity.sub(quantity) } });

      trade = await tx.realTrade.create({
        data: { userId, athleteId, environment: SANDBOX, side, quantity, price, gross, fee: TRADE_FEE, netCashFlow: totalDebit.neg(), realizedPnl: 0 },
      });
      await tx.realLedgerEntry.createMany({ data: [
        { userId, environment: SANDBOX, type: RealLedgerType.TRADE_BUY, amount: gross.neg(), balance: afterTrade, reference: trade.id },
        { userId, environment: SANDBOX, type: RealLedgerType.TRADE_FEE, amount: TRADE_FEE.neg(), balance: finalBalance, reference: trade.id },
      ] });
    } else {
      if (!position || position.quantity.lt(quantity)) throw new Error("Insufficient sandbox athlete units.");
      if (gross.lte(TRADE_FEE)) throw new Error("Sell value must be greater than the $2 trade fee.");
      if (providerWallet.balance.lt(gross)) throw new Error("LP sandbox cash changed before execution.");

      const netCredit = gross.sub(TRADE_FEE);
      const afterTrade = wallet.balance.add(gross);
      finalBalance = afterTrade.sub(TRADE_FEE);
      providerCashFlow = gross.neg();
      const remainingPosition = position.quantity.sub(quantity);
      const realizedPnl = netCredit.sub(position.averageCost.mul(quantity)).toDecimalPlaces(2);

      await tx.realWallet.update({ where: { id: wallet.id }, data: { balance: finalBalance } });
      if (remainingPosition.eq(0)) await tx.realPosition.delete({ where: { id: position.id } });
      else await tx.realPosition.update({ where: { id: position.id }, data: { quantity: remainingPosition } });
      await tx.liquidityProviderWallet.update({ where: { id: providerWallet.id }, data: { balance: providerWallet.balance.sub(gross) } });
      await tx.liquidityProviderInventory.upsert({
        where: { providerId_instrumentId: { providerId: currentQuote.providerId, instrumentId: instrument.id } },
        create: { providerId: currentQuote.providerId, instrumentId: instrument.id, quantity },
        update: { quantity: { increment: quantity } },
      });

      trade = await tx.realTrade.create({
        data: { userId, athleteId, environment: SANDBOX, side, quantity, price, gross, fee: TRADE_FEE, netCashFlow: netCredit, realizedPnl },
      });
      await tx.realLedgerEntry.createMany({ data: [
        { userId, environment: SANDBOX, type: RealLedgerType.TRADE_SELL, amount: gross, balance: afterTrade, reference: trade.id },
        { userId, environment: SANDBOX, type: RealLedgerType.TRADE_FEE, amount: TRADE_FEE.neg(), balance: finalBalance, reference: trade.id },
      ] });
    }

    const remainingQuote = currentQuote.remaining.sub(quantity);
    await tx.liquidityQuote.update({
      where: { id: currentQuote.id },
      data: { remaining: remainingQuote, status: remainingQuote.eq(0) ? LiquidityQuoteStatus.FILLED : LiquidityQuoteStatus.ACTIVE },
    });
    const fill = await tx.liquidityFill.create({
      data: {
        quoteId: currentQuote.id,
        providerId: currentQuote.providerId,
        instrumentId: instrument.id,
        customerUserId: userId,
        side: currentQuote.side,
        quantity,
        price,
        gross,
        providerCashFlow,
      },
    });
    return { trade, balance: finalBalance, fill };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function fundSandboxSettlementReserve(amountInput: number | string) {
  assertRealMarketSandbox();
  const amount = positiveDecimal(amountInput, "Reserve funding", 2);
  return prisma.realSettlementReserve.upsert({
    where: { environment: SANDBOX },
    create: { environment: SANDBOX, balance: amount },
    update: { balance: { increment: amount } },
  });
}

export async function beginSandboxCareerEndingRetirement(athleteId: string, reason: string, now = new Date()) {
  assertRealMarketSandbox();
  const instrument = await prisma.realMarketInstrument.findUnique({
    where: { athleteId_environment: { athleteId, environment: SANDBOX } },
    include: { athlete: true },
  });
  if (!instrument || instrument.status !== RealInstrumentStatus.ACTIVE) throw new Error("Only an active sandbox instrument can enter career-ending retirement.");
  if (reason.trim().length < 4) throw new Error("Retirement reason is required.");

  const retirementDeadline = new Date(now.getTime() + realMarket.careerEndingRetirementDays * 86400000);
  await prisma.$transaction([
    prisma.liquidityQuote.updateMany({
      where: { instrumentId: instrument.id, status: LiquidityQuoteStatus.ACTIVE },
      data: { status: LiquidityQuoteStatus.CANCELLED, remaining: 0 },
    }),
    prisma.realMarketInstrument.update({
      where: { id: instrument.id },
      data: {
        status: RealInstrumentStatus.RETIRING,
        frozenSettlementPrice: instrument.referencePrice,
        retirementDeadline,
        retirementReason: reason.trim().slice(0, 240),
      },
    }),
  ]);

  return { ...instrument, status: RealInstrumentStatus.RETIRING, frozenSettlementPrice: instrument.referencePrice, retirementDeadline };
}

export async function settleExpiredSandboxRetirements(now = new Date()) {
  assertRealMarketSandbox();
  const instruments = await prisma.realMarketInstrument.findMany({
    where: { environment: SANDBOX, status: RealInstrumentStatus.RETIRING, retirementDeadline: { lte: now } },
    include: { athlete: true },
  });
  const settled: string[] = [];

  for (const instrument of instruments) {
    if (!instrument.frozenSettlementPrice) throw new Error(`Instrument ${instrument.id} has no frozen settlement price.`);
    const positions = await prisma.realPosition.findMany({
      where: { environment: SANDBOX, athleteId: instrument.athleteId, quantity: { gt: 0 } },
    });
    const totalPayout = positions.reduce((sum, position) => sum.add(instrument.frozenSettlementPrice!.mul(position.quantity).toDecimalPlaces(2)), ZERO);

    await prisma.$transaction(async (tx) => {
      const reserve = await tx.realSettlementReserve.upsert({
        where: { environment: SANDBOX },
        create: { environment: SANDBOX, balance: 0 },
        update: {},
      });
      if (reserve.balance.lt(totalPayout)) throw new Error(`Settlement reserve is underfunded for ${instrument.athlete.name}.`);

      for (const position of positions) {
        const gross = instrument.frozenSettlementPrice!.mul(position.quantity).toDecimalPlaces(2);
        const wallet = await tx.realWallet.upsert({
          where: { userId_environment: { userId: position.userId, environment: SANDBOX } },
          create: { userId: position.userId, environment: SANDBOX, currency: "USD", balance: 0 },
          update: {},
        });
        const newBalance = wallet.balance.add(gross);
        const realizedPnl = gross.sub(position.averageCost.mul(position.quantity)).toDecimalPlaces(2);
        await tx.realWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
        const trade = await tx.realTrade.create({
          data: {
            userId: position.userId,
            athleteId: position.athleteId,
            environment: SANDBOX,
            side: TradeSide.SELL,
            quantity: position.quantity,
            price: instrument.frozenSettlementPrice!,
            gross,
            fee: 0,
            netCashFlow: gross,
            realizedPnl,
          },
        });
        await tx.realLedgerEntry.create({
          data: {
            userId: position.userId,
            environment: SANDBOX,
            type: RealLedgerType.RETIREMENT_SETTLEMENT,
            amount: gross,
            balance: newBalance,
            reference: trade.id,
          },
        });
        await tx.realPosition.delete({ where: { id: position.id } });
      }

      await tx.realSettlementReserve.update({ where: { id: reserve.id }, data: { balance: reserve.balance.sub(totalPayout) } });
      await tx.realSettlementEvent.create({ data: { instrumentId: instrument.id, amount: totalPayout, holders: positions.length } });
      await tx.realMarketInstrument.update({ where: { id: instrument.id }, data: { status: RealInstrumentStatus.RETIRED } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    settled.push(instrument.id);
    await addNextEligibleInstrument(instrument.athlete.sport);
  }

  return settled;
}

export async function haltSandboxInstrument(instrumentId: string, reason = "Administrative halt") {
  assertRealMarketSandbox();
  await prisma.liquidityQuote.updateMany({
    where: { instrumentId, status: LiquidityQuoteStatus.ACTIVE },
    data: { status: LiquidityQuoteStatus.CANCELLED, remaining: 0 },
  });
  return prisma.realMarketInstrument.update({
    where: { id: instrumentId },
    data: { status: RealInstrumentStatus.HALTED, retirementReason: reason.slice(0, 240) },
  });
}

export async function suspendSandboxLiquidityProvider(providerId: string) {
  assertRealMarketSandbox();
  await cancelAllSandboxProviderQuotes(providerId);
  return prisma.liquidityProvider.update({ where: { id: providerId }, data: { status: LiquidityProviderStatus.SUSPENDED } });
}
