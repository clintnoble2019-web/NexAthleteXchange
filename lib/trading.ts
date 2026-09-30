import { Prisma, TradeSide } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MIN_TRADE_QUANTITY = new Prisma.Decimal("0.01");

export async function executeTrade(userId: string, athleteId: string, side: TradeSide, quantityInput: number) {
  if (!Number.isFinite(quantityInput)) throw new Error("Quantity must be a valid number.");

  const quantity = new Prisma.Decimal(String(quantityInput));
  if (quantity.lt(MIN_TRADE_QUANTITY)) throw new Error("Minimum trade quantity is 0.01 units.");

  return prisma.$transaction(async (tx) => {
    const [wallet, athlete, position] = await Promise.all([
      tx.wallet.findUnique({ where: { userId } }),
      tx.athlete.findUnique({ where: { id: athleteId } }),
      tx.position.findUnique({ where: { userId_athleteId: { userId, athleteId } } })
    ]);

    if (!wallet) throw new Error("Wallet not found.");
    if (!athlete || !athlete.active) throw new Error("Athlete is not available for trading.");

    const price = athlete.currentPrice;
    const total = price.mul(quantity).toDecimalPlaces(2);
    if (total.lt(new Prisma.Decimal("0.01"))) throw new Error("Trade value must be at least $0.01.");

    if (side === TradeSide.BUY) {
      if (wallet.balance.lt(total)) throw new Error("Insufficient virtual cash.");

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

      const trade = await tx.trade.create({ data: { userId, athleteId, side, quantity, price, total } });
      await tx.ledgerEntry.create({
        data: { userId, type: "TRADE_BUY", amount: total.neg(), balance: newBalance, reference: trade.id }
      });
      return trade;
    }

    if (!position || position.quantity.lt(quantity)) throw new Error("Insufficient athlete units.");

    const newBalance = wallet.balance.add(total);
    const remaining = position.quantity.sub(quantity);

    await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });
    if (remaining.eq(0)) await tx.position.delete({ where: { id: position.id } });
    else await tx.position.update({ where: { id: position.id }, data: { quantity: remaining } });

    const trade = await tx.trade.create({ data: { userId, athleteId, side, quantity, price, total } });
    await tx.ledgerEntry.create({
      data: { userId, type: "TRADE_SELL", amount: total, balance: newBalance, reference: trade.id }
    });
    return trade;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
