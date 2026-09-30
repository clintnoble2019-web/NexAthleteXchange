import { Prisma, TradeSide } from "@prisma/client";
import { assertTradingOpen } from "@/lib/beta-controls";
import { prisma } from "@/lib/prisma";

const MIN_TRADE_QUANTITY = new Prisma.Decimal("0.01");
const MIN_TRADE_VALUE = new Prisma.Decimal("0.01");

export async function executeTrade(userId: string, athleteId: string, side: TradeSide, quantityInput: number, requestKey?: string) {
  if (![TradeSide.BUY, TradeSide.SELL].includes(side)) throw new Error("Invalid trade side.");
  if (requestKey && !/^[a-zA-Z0-9_-]{16,100}$/.test(requestKey)) throw new Error("Invalid trade request identifier.");
  if (!Number.isFinite(quantityInput)) throw new Error("Quantity must be a valid number.");

  const quantity = new Prisma.Decimal(String(quantityInput));
  if (quantity.decimalPlaces() > 4 || quantity.gt(1000000)) throw new Error("Use up to four decimal places and at most 1,000,000 units.");
  if (quantity.lt(MIN_TRADE_QUANTITY)) throw new Error("Minimum trade quantity is 0.01 units.");

  const fingerprint = `${athleteId}:${side}:${quantity.toString()}`;
  return prisma.$transaction(async (tx) => {
    await assertTradingOpen(tx, userId);
    if (requestKey) {
      const existing = await tx.tradeRequest.findUnique({ where: { userId_requestKey: { userId, requestKey } } });
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new Error("This request identifier was already used for another trade.");
        return tx.trade.findUniqueOrThrow({ where: { id: existing.tradeId } });
      }
    }
    const [wallet, athlete, position] = await Promise.all([
      tx.wallet.findUnique({ where: { userId } }),
      tx.athlete.findUnique({ where: { id: athleteId } }),
      tx.position.findUnique({ where: { userId_athleteId: { userId, athleteId } } })
    ]);

    if (!wallet) throw new Error("NexPoints wallet not found.");
    if (!athlete || !athlete.active || !athlete.marketEnabled) throw new Error("Athlete is not available for trading.");

    const price = athlete.currentPrice;
    const total = price.mul(quantity).toDecimalPlaces(2);
    if (total.lt(MIN_TRADE_VALUE)) throw new Error("Trade value must be at least N⟡0.01.");

    if (side === TradeSide.BUY) {
      if (wallet.balance.lt(total)) throw new Error("Insufficient NexPoints balance.");

      const newBalance = wallet.balance.sub(total);
      const oldQty = position?.quantity ?? new Prisma.Decimal(0);
      const oldCost = position ? position.averageCost.mul(oldQty) : new Prisma.Decimal(0);
      const newQty = oldQty.add(quantity);
      const averageCost = oldCost.add(total).div(newQty);

      await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });
      await tx.position.upsert({
        where: { userId_athleteId: { userId, athleteId } },
        create: { userId, athleteId, quantity, averageCost },
        update: { quantity: newQty, averageCost }
      });

      const trade = await tx.trade.create({
        data: { userId, athleteId, side, quantity, price, total, realizedPnl: 0 }
      });
      await tx.ledgerEntry.create({
        data: { userId, type: "TRADE_BUY", amount: total.neg(), balance: newBalance, reference: trade.id }
      });
      if (requestKey) await tx.tradeRequest.create({ data: { userId, requestKey, fingerprint, tradeId: trade.id } });
      return trade;
    }

    if (!position || position.quantity.lt(quantity)) throw new Error("Insufficient athlete units.");

    const newBalance = wallet.balance.add(total);
    const remaining = position.quantity.sub(quantity);
    const realizedPnl = price.sub(position.averageCost).mul(quantity).toDecimalPlaces(2);

    await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });
    if (remaining.eq(0)) await tx.position.delete({ where: { id: position.id } });
    else await tx.position.update({ where: { id: position.id }, data: { quantity: remaining } });

    const trade = await tx.trade.create({
      data: { userId, athleteId, side, quantity, price, total, realizedPnl }
    });
    await tx.ledgerEntry.create({
      data: { userId, type: "TRADE_SELL", amount: total, balance: newBalance, reference: trade.id }
    });
    if (requestKey) await tx.tradeRequest.create({ data: { userId, requestKey, fingerprint, tradeId: trade.id } });
    return trade;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
