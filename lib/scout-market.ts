import { createHash } from "node:crypto";
import { Prisma, ScoutOrder, TradeSide, RealFundingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTradingOpen } from "@/lib/beta-controls";
import { assertRealMarketSandbox, realMarket } from "@/lib/real-market";

const ZERO = new Prisma.Decimal(0);
const FEE = new Prisma.Decimal(realMarket.tradeFee);
export const OPEN_ORDER_STATUSES = ["OPEN", "PARTIAL"] as const;
const openStatuses = [...OPEN_ORDER_STATUSES];
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function decimal(value: string | number, label: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(String(value))) throw new Error(`${label} must use at most two decimal places.`);
  const result = new Prisma.Decimal(String(value));
  if (result.lt("0.01") || result.gt(1000000)) throw new Error(`${label} must be between 0.01 and 1,000,000.`);
  return result;
}
function requestKey(value: string) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(value)) throw new Error("A valid request identifier is required.");
  return value;
}
export async function scoutTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  assertRealMarketSandbox();
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 }); }
    catch (error) {
      if (attempt >= 4 || !(error instanceof Prisma.PrismaClientKnownRequestError) || !["P2034", "P2002"].includes(error.code)) throw error;
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 15));
    }
  }
}
async function wallet(tx: Prisma.TransactionClient, userId: string) {
  const result = await tx.scoutWallet.upsert({ where: { userId }, create: { userId }, update: {} });
  if (result.environment !== "SANDBOX") throw new Error("Only sandbox accounts are supported.");
  return result;
}
async function instrument(tx: Prisma.TransactionClient, athleteId: string) {
  const item = await tx.realMarketInstrument.findUnique({ where: { athleteId_environment: { athleteId, environment: "SANDBOX" } }, include: { athlete: true } });
  if (!item || item.status !== "ACTIVE" || !item.athlete.active || !item.athlete.marketEnabled) throw new Error("This athlete is not open for test orders.");
  return item;
}
async function ledger(tx: Prisma.TransactionClient, userId: string, type: string, amount: Prisma.Decimal, balance: Prisma.Decimal, reservedAfter: Prisma.Decimal, reference: string) {
  await tx.scoutLedgerEntry.create({ data: { userId, type, amount, balance, reservedAfter, reference } });
}
function cashHold(order: Pick<ScoutOrder, "side" | "price" | "feePaid">, remaining: Prisma.Decimal) {
  if (remaining.eq(0)) return ZERO;
  const fee = order.feePaid.eq(0) ? FEE : ZERO;
  return order.side === "BUY" ? order.price.mul(remaining).toDecimalPlaces(2, Prisma.Decimal.ROUND_UP).add(fee) : fee;
}
async function releaseOrder(tx: Prisma.TransactionClient, order: ScoutOrder, reason: string) {
  if (!openStatuses.includes(order.status as "OPEN" | "PARTIAL")) return order;
  const account = await wallet(tx, order.userId);
  const reserved = account.reservedCash.sub(order.cashHold);
  if (reserved.lt(0)) throw new Error("Order backing does not reconcile.");
  await tx.scoutWallet.update({ where: { userId: order.userId }, data: { reservedCash: reserved } });
  if (order.side === "SELL") {
    const position = await tx.scoutPosition.findUniqueOrThrow({ where: { userId_athleteId: { userId: order.userId, athleteId: order.athleteId } } });
    if (position.reservedQuantity.lt(order.remaining)) throw new Error("Position backing does not reconcile.");
    await tx.scoutPosition.update({ where: { id: position.id }, data: { reservedQuantity: position.reservedQuantity.sub(order.remaining) } });
  }
  const result = await tx.scoutOrder.update({ where: { id: order.id }, data: { status: "CANCELED", cashHold: 0, cancelReason: reason } });
  await ledger(tx, order.userId, "ORDER_RELEASE", ZERO, account.balance, reserved, order.id);
  return result;
}
export async function cancelScoutOrdersTx(tx: Prisma.TransactionClient, where: Prisma.ScoutOrderWhereInput, reason: string) {
  const orders = await tx.scoutOrder.findMany({ where: { ...where, environment: "SANDBOX", status: { in: openStatuses } }, orderBy: { sequence: "asc" } });
  for (const order of orders) await releaseOrder(tx, order, reason);
  return orders.length;
}
export async function cancelScoutOrder(userId: string, orderId: string) {
  return scoutTransaction(async tx => {
    const order = await tx.scoutOrder.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId || order.environment !== "SANDBOX") throw new Error("Order not found.");
    // Cancellation releases backing even while trading is paused or verification is revoked.
    return releaseOrder(tx, order, "Canceled by customer");
  });
}

export async function transferScoutTestCash(userId: string, type: RealFundingType, amountInput: string | number, key: string) {
  if (!Object.values(RealFundingType).includes(type)) throw new Error("Invalid cash action.");
  const amount = decimal(amountInput, "Amount").toDecimalPlaces(2);
  requestKey(key);
  const hash = fingerprint([type, String(amount)]);
  return scoutTransaction(async tx => {
    await assertTradingOpen(tx, userId, true);
    const previous = await tx.scoutCashTransfer.findUnique({ where: { userId_requestKey: { userId, requestKey: key } } });
    if (previous) { if (previous.fingerprint !== hash) throw new Error("Request identifier already used for another cash action."); return previous; }
    const account = await wallet(tx, userId);
    if (type === "WITHDRAWAL" && account.balance.sub(account.reservedCash).lt(amount)) throw new Error("Only available test cash can be withdrawn. Cancel an order to release its hold.");
    if (type === "DEPOSIT" && account.balance.add(amount).gt(1000000)) throw new Error("Test cash balance is capped at $1,000,000.");
    const signed = type === "DEPOSIT" ? amount : amount.neg();
    const balance = account.balance.add(signed);
    const transfer = await tx.scoutCashTransfer.create({ data: { userId, type, amount, requestKey: key, fingerprint: hash } });
    await tx.scoutWallet.update({ where: { userId }, data: { balance } });
    await ledger(tx, userId, `TEST_${type}`, signed, balance, account.reservedCash, transfer.id);
    return transfer;
  });
}

export async function claimScoutTestInventory(userId: string, athleteId: string) {
  return scoutTransaction(async tx => {
    await assertTradingOpen(tx, userId, true);
    await instrument(tx, athleteId);
    const previous = await tx.scoutInventoryGrant.findUnique({ where: { userId_athleteId: { userId, athleteId } } });
    if (previous) return previous;
    const quantity = new Prisma.Decimal(10);
    const grant = await tx.scoutInventoryGrant.create({ data: { userId, athleteId, quantity } });
    await tx.scoutPosition.upsert({ where: { userId_athleteId: { userId, athleteId } }, create: { userId, athleteId, quantity }, update: { quantity: { increment: quantity } } });
    const account = await wallet(tx, userId);
    await ledger(tx, userId, "TEST_INVENTORY_GRANT", ZERO, account.balance, account.reservedCash, grant.id);
    return grant;
  });
}

async function settleFill(tx: Prisma.TransactionClient, buy: ScoutOrder, sell: ScoutOrder, quantity: Prisma.Decimal, price: Prisma.Decimal) {
  const gross = price.mul(quantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
  if (gross.lt("0.01")) return null; // Sub-cent fills cannot move settled cash.
  const buyFee = buy.feePaid.eq(0) ? FEE : ZERO;
  const sellFee = sell.feePaid.eq(0) ? FEE : ZERO;
  const buyRemaining = buy.remaining.sub(quantity), sellRemaining = sell.remaining.sub(quantity);
  const nextBuy = { ...buy, remaining: buyRemaining, feePaid: buy.feePaid.add(buyFee) };
  const nextSell = { ...sell, remaining: sellRemaining, feePaid: sell.feePaid.add(sellFee) };
  const buyHold = cashHold(nextBuy, buyRemaining), sellHold = cashHold(nextSell, sellRemaining);
  const buyer = await wallet(tx, buy.userId), seller = await wallet(tx, sell.userId);
  const buyReserved = buyer.reservedCash.sub(buy.cashHold).add(buyHold);
  const sellReserved = seller.reservedCash.sub(sell.cashHold).add(sellHold);
  const buyBalance = buyer.balance.sub(gross).sub(buyFee), sellBalance = seller.balance.add(gross).sub(sellFee);
  if (buyReserved.lt(0) || sellReserved.lt(0) || buyBalance.lt(buyReserved) || sellBalance.lt(sellReserved)) throw new Error("Insufficient order backing.");
  const sellerPosition = await tx.scoutPosition.findUniqueOrThrow({ where: { userId_athleteId: { userId: sell.userId, athleteId: sell.athleteId } } });
  if (sellerPosition.quantity.lt(quantity) || sellerPosition.reservedQuantity.lt(quantity)) throw new Error("Insufficient reserved position.");
  const soldBasis = quantity.eq(sellerPosition.quantity) ? sellerPosition.costBasis : sellerPosition.costBasis.mul(quantity).div(sellerPosition.quantity).toDecimalPlaces(2);
  await tx.scoutPosition.update({ where: { id: sellerPosition.id }, data: { quantity: sellerPosition.quantity.sub(quantity), reservedQuantity: sellerPosition.reservedQuantity.sub(quantity), costBasis: sellerPosition.costBasis.sub(soldBasis) } });
  await tx.scoutPosition.upsert({ where: { userId_athleteId: { userId: buy.userId, athleteId: buy.athleteId } }, create: { userId: buy.userId, athleteId: buy.athleteId, quantity, costBasis: gross.add(buyFee) }, update: { quantity: { increment: quantity }, costBasis: { increment: gross.add(buyFee) } } });
  await tx.scoutWallet.update({ where: { userId: buy.userId }, data: { balance: buyBalance, reservedCash: buyReserved } });
  await tx.scoutWallet.update({ where: { userId: sell.userId }, data: { balance: sellBalance, reservedCash: sellReserved } });
  const fill = await tx.scoutFill.create({ data: { buyOrderId: buy.id, sellOrderId: sell.id, quantity, price, gross, buyFee, sellFee, sellerPnl: gross.sub(sellFee).sub(soldBasis) } });
  await ledger(tx, buy.userId, "FILL_BUY", gross.neg(), buyer.balance.sub(gross), buyReserved, fill.id);
  if (buyFee.gt(0)) await ledger(tx, buy.userId, "TRADE_FEE", buyFee.neg(), buyBalance, buyReserved, fill.id);
  await ledger(tx, sell.userId, "FILL_SELL", gross, seller.balance.add(gross), sellReserved, fill.id);
  if (sellFee.gt(0)) await ledger(tx, sell.userId, "TRADE_FEE", sellFee.neg(), sellBalance, sellReserved, fill.id);
  const updatedBuy = await tx.scoutOrder.update({ where: { id: buy.id }, data: { remaining: buyRemaining, feePaid: nextBuy.feePaid, cashHold: buyHold, status: buyRemaining.eq(0) ? "FILLED" : "PARTIAL" } });
  const updatedSell = await tx.scoutOrder.update({ where: { id: sell.id }, data: { remaining: sellRemaining, feePaid: nextSell.feePaid, cashHold: sellHold, status: sellRemaining.eq(0) ? "FILLED" : "PARTIAL" } });
  return { buy: updatedBuy, sell: updatedSell };
}

export async function placeScoutOrder(input: { userId: string; athleteId: string; side: TradeSide; price: string | number; quantity: string | number; requestKey: string }) {
  if (!Object.values(TradeSide).includes(input.side)) throw new Error("Choose buy or sell.");
  const price = decimal(input.price, "Limit price"), quantity = decimal(input.quantity, "Quantity");
  if (price.mul(quantity).gt(1000000) || price.mul(quantity).lt("2.01")) throw new Error("Order value must be between $2.01 and $1,000,000 before fees.");
  requestKey(input.requestKey);
  const hash = fingerprint([input.athleteId, input.side, String(price), String(quantity)]);
  return scoutTransaction(async tx => {
    await assertTradingOpen(tx, input.userId, true);
    const previous = await tx.scoutOrder.findUnique({ where: { userId_requestKey: { userId: input.userId, requestKey: input.requestKey } } });
    if (previous) { if (previous.fingerprint !== hash) throw new Error("Request identifier already used for another order."); return previous; }
    await instrument(tx, input.athleteId);
    if (await tx.scoutOrder.count({ where: { userId: input.userId, status: { in: openStatuses } } }) >= 100) throw new Error("Cancel an open order before placing another.");
    const opposite = input.side === "BUY" ? "SELL" : "BUY";
    const crossingPrice = input.side === "BUY" ? { lte: price } : { gte: price };
    if (await tx.scoutOrder.findFirst({ where: { userId: input.userId, athleteId: input.athleteId, status: { in: openStatuses }, side: opposite, price: crossingPrice } })) throw new Error("This order would trade with your own order. Cancel it first.");
    const account = await wallet(tx, input.userId);
    const hold = input.side === "BUY" ? price.mul(quantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_UP).add(FEE) : FEE;
    if (account.balance.sub(account.reservedCash).lt(hold)) throw new Error(input.side === "SELL" ? "Reserve $2 in available test cash for the sell fee." : "Insufficient available test cash for the buy and its fee.");
    if (input.side === "SELL") {
      const position = await tx.scoutPosition.findUnique({ where: { userId_athleteId: { userId: input.userId, athleteId: input.athleteId } } });
      if (!position || position.environment !== "SANDBOX" || position.quantity.sub(position.reservedQuantity).lt(quantity)) throw new Error("Insufficient available test shares.");
      await tx.scoutPosition.update({ where: { id: position.id }, data: { reservedQuantity: position.reservedQuantity.add(quantity) } });
    }
    let order = await tx.scoutOrder.create({ data: { userId: input.userId, athleteId: input.athleteId, side: input.side, price, quantity, remaining: quantity, cashHold: hold, requestKey: input.requestKey, fingerprint: hash } });
    await tx.scoutWallet.update({ where: { userId: input.userId }, data: { reservedCash: account.reservedCash.add(hold) } });
    await ledger(tx, input.userId, "ORDER_HOLD", ZERO, account.balance, account.reservedCash.add(hold), order.id);
    const makers = await tx.scoutOrder.findMany({ where: { athleteId: input.athleteId, environment: "SANDBOX", side: opposite, status: { in: openStatuses }, price: crossingPrice }, orderBy: [{ price: input.side === "BUY" ? "asc" : "desc" }, { sequence: "asc" }], take: 101, include: { user: { select: { accountFrozen: true, realEnrollment: true } } } });
    for (const maker of makers.slice(0, 100)) {
      if (order.remaining.eq(0)) break;
      if (maker.user.accountFrozen || maker.user.realEnrollment?.status !== "VERIFIED" || maker.user.realEnrollment.environment !== "SANDBOX") { await releaseOrder(tx, maker, "Counterparty access unavailable"); continue; }
      const fill = await settleFill(tx, input.side === "BUY" ? order : maker, input.side === "SELL" ? order : maker, Prisma.Decimal.min(order.remaining, maker.remaining), maker.price);
      if (fill) order = input.side === "BUY" ? fill.buy : fill.sell;
    }
    if (order.remaining.gt(0) && makers.length > 100) throw new Error("This order crosses too many resting orders. Reduce the test quantity.");
    return order;
  });
}

export async function ensureScoutWallet(userId: string) { return scoutTransaction(tx => wallet(tx, userId)); }
export function visibleScoutOrders(athleteId: string): Prisma.ScoutOrderWhereInput {
  return { athleteId, environment: "SANDBOX", status: { in: openStatuses }, user: { accountFrozen: false, realEnrollment: { is: { status: "VERIFIED", environment: "SANDBOX" } } } };
}
