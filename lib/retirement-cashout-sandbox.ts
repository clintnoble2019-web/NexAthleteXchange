import { assertTradingOpen } from "@/lib/beta-controls";
import { Prisma, RealInstrumentStatus, RealLedgerType, RealMarketEnvironment, TradeSide } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertRealMarketSandbox } from "@/lib/real-market";

const SANDBOX = RealMarketEnvironment.SANDBOX;

export async function cashOutRetiringSandboxPosition(
  userId: string,
  athleteId: string,
  quantityInput?: number | string,
) {
  assertRealMarketSandbox();
  return prisma.$transaction(async (tx) => {
    await assertTradingOpen(tx, userId, true);
    const instrument = await tx.realMarketInstrument.findUnique({
      where: { athleteId_environment: { athleteId, environment: SANDBOX } },
      include: { athlete: true },
    });
    if (!instrument || instrument.status !== RealInstrumentStatus.RETIRING || !instrument.frozenSettlementPrice || !instrument.retirementDeadline) {
      throw new Error("This athlete is not in the seven-day retirement cashout window.");
    }
    if (instrument.retirementDeadline <= new Date()) throw new Error("The retirement cashout window has ended; automatic settlement is pending.");

    const position = await tx.realPosition.findUnique({
      where: { userId_athleteId_environment: { userId, athleteId, environment: SANDBOX } },
    });
    if (!position || position.quantity.lte(0)) throw new Error("No retiring athlete position is available to cash out.");

    const quantity = quantityInput === undefined
      ? position.quantity
      : new Prisma.Decimal(String(quantityInput)).toDecimalPlaces(4);
    if (!quantity.isFinite() || quantity.lte(0) || quantity.gt(position.quantity)) throw new Error("Invalid retirement cashout quantity.");

    const gross = instrument.frozenSettlementPrice.mul(quantity).toDecimalPlaces(2);
    const reserve = await tx.realSettlementReserve.upsert({
      where: { environment: SANDBOX },
      create: { environment: SANDBOX, balance: 0 },
      update: {},
    });
    if (reserve.balance.lt(gross)) throw new Error("Settlement reserve is underfunded for this cashout.");

    const wallet = await tx.realWallet.upsert({
      where: { userId_environment: { userId, environment: SANDBOX } },
      create: { userId, environment: SANDBOX, currency: "USD", balance: 0 },
      update: {},
    });
    const newBalance = wallet.balance.add(gross);
    const remaining = position.quantity.sub(quantity);
    const realizedPnl = gross.sub(position.averageCost.mul(quantity)).toDecimalPlaces(2);

    await tx.realWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
    await tx.realSettlementReserve.update({ where: { id: reserve.id }, data: { balance: reserve.balance.sub(gross) } });
    if (remaining.eq(0)) await tx.realPosition.delete({ where: { id: position.id } });
    else await tx.realPosition.update({ where: { id: position.id }, data: { quantity: remaining } });

    const trade = await tx.realTrade.create({
      data: {
        userId,
        athleteId,
        environment: SANDBOX,
        side: TradeSide.SELL,
        quantity,
        price: instrument.frozenSettlementPrice,
        gross,
        fee: 0,
        netCashFlow: gross,
        realizedPnl,
      },
    });
    await tx.realLedgerEntry.create({
      data: {
        userId,
        environment: SANDBOX,
        type: RealLedgerType.RETIREMENT_SETTLEMENT,
        amount: gross,
        balance: newBalance,
        reference: trade.id,
      },
    });

    return {
      athlete: instrument.athlete.name,
      quantity,
      frozenPrice: instrument.frozenSettlementPrice,
      gross,
      remaining,
      balance: newBalance,
      deadline: instrument.retirementDeadline,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
