import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { placeScoutOrder, cancelScoutOrder, claimScoutTestInventory, transferScoutTestCash } from "../lib/scout-market";
import { beginSandboxCareerEndingRetirement } from "../lib/liquidity-provider-sandbox";
import { applyAdminAction } from "../lib/admin";
import { reviewSandboxIdentity } from "../lib/identity";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const users: string[] = [], athletes: string[] = [];
const unique = randomUUID().slice(0, 8);
const order = (userId: string, athleteId: string, side: "BUY" | "SELL", price: string, quantity: string, requestKey = randomUUID()) => placeScoutOrder({ userId, athleteId, side, price, quantity, requestKey });
async function candidate(label: string) {
  const a = await prisma.athlete.create({ data: { name: `Scout test ${label}`, slug: `scout-${unique}-${label}`, sport: "NBA", league: "NBA", team: "TEST", position: "G", currentPrice: 100, previousPrice: 100, realMarketInstruments: { create: { environment: "SANDBOX", referencePrice: 100 } } } });
  athletes.push(a.id); return a.id;
}
async function account(label: string, verified = true) {
  const u = await prisma.user.create({ data: { username: `scout_${unique}_${label}`, email: `scout-${unique}-${label}@example.test`, passwordHash: "isolated-test-only", ...(verified ? { realEnrollment: { create: { status: "VERIFIED", environment: "SANDBOX", identityHash: `scout-test-${unique}-${label}` } } } : {}) } });
  users.push(u.id); if (verified) await transferScoutTestCash(u.id, "DEPOSIT", "1000", randomUUID()); return u.id;
}
async function main() {
  if (process.env.FOUNDATION4_TEST_DATABASE !== "1") throw new Error("Customer matching tests require an isolated acceptance database.");
  const admin = await account("admin"); process.env.ADMIN_USER_IDS = admin;
  const seller = await account("seller"), seller2 = await account("seller2"), buyer = await account("buyer"), buyer2 = await account("buyer2"), unverified = await account("pending", false);
  const a = await candidate("main");
  await assert.rejects(transferScoutTestCash(unverified, "DEPOSIT", "100", randomUUID()), /verification/);
  await claimScoutTestInventory(seller, a); await claimScoutTestInventory(seller, a);
  assert.equal(Number((await prisma.scoutPosition.findUniqueOrThrow({ where: { userId_athleteId: { userId: seller, athleteId: a } } })).quantity), 10);
  const ask = await order(seller, a, "SELL", "10", "6");
  assert.equal(Number((await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: seller } })).reservedCash), 2);
  const key = randomUUID();
  const buy = await order(buyer, a, "BUY", "12", "2", key);
  assert.equal(buy.status, "FILLED");
  assert.equal((await order(buyer, a, "BUY", "12", "2", key)).id, buy.id);
  await assert.rejects(order(buyer, a, "BUY", "12", "3", key), /already used/);
  let fill = await prisma.scoutFill.findFirstOrThrow({ where: { buyOrderId: buy.id } });
  assert.equal(Number(fill.price), 10, "Execution uses the resting limit, not the reference or taker limit.");
  assert.equal(Number((await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: buyer } })).balance), 978);
  assert.equal(Number((await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: seller } })).balance), 1018);
  await order(buyer2, a, "BUY", "11", "2");
  assert.equal(Number((await prisma.scoutOrder.findUniqueOrThrow({ where: { id: ask.id } })).feePaid), 2, "Partial fills do not repeat the flat fee.");
  await cancelScoutOrder(seller, ask.id); await cancelScoutOrder(seller, ask.id);
  await assert.rejects(cancelScoutOrder(buyer, ask.id), /not found/);
  assert.equal(Number((await prisma.scoutPosition.findUniqueOrThrow({ where: { userId_athleteId: { userId: seller, athleteId: a } } })).reservedQuantity), 0);
  assert.equal(Number((await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: seller } })).balance), 1038);
  await order(seller, a, "SELL", "9", "1"); const better = await order(seller, a, "SELL", "8", "1");
  const sweep = await order(buyer, a, "BUY", "10", "2");
  const sweepFills = await prisma.scoutFill.findMany({ where: { buyOrderId: sweep.id } });
  assert.ok(sweepFills.some(f => f.sellOrderId === better.id)); assert.equal(sweepFills.reduce((n, f) => n + Number(f.gross), 0), 17);
  assert.equal(sweepFills.reduce((n, f) => n + Number(f.buyFee), 0), 2);
  await claimScoutTestInventory(seller2, a);
  const first = await order(seller, a, "SELL", "7", "1"); const second = await order(seller2, a, "SELL", "7", "1");
  const fifo = await order(buyer2, a, "BUY", "7", "1");
  fill = await prisma.scoutFill.findFirstOrThrow({ where: { buyOrderId: fifo.id } }); assert.equal(fill.sellOrderId, first.id);
  await assert.rejects(order(seller2, a, "BUY", "7", "1"), /own order/); await cancelScoutOrder(seller2, second.id);
  const b = await candidate("cash"); const held = await order(buyer, b, "BUY", "100", "6");
  const cash = await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: buyer } });
  await assert.rejects(transferScoutTestCash(buyer, "WITHDRAWAL", String(cash.balance), randomUUID()), /available test cash/);
  await cancelScoutOrder(buyer, held.id); assert.equal(Number((await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: buyer } })).reservedCash), 0);
  const raceUser = await account("racecash");
  const cashRace = await Promise.allSettled([order(raceUser, b, "BUY", "100", "6"), order(raceUser, b, "BUY", "100", "6")]);
  assert.equal(cashRace.filter(r => r.status === "fulfilled").length, 1, "Concurrent orders cannot spend the same cash twice.");
  const c = await candidate("shares"); await claimScoutTestInventory(seller, c);
  const shareRace = await Promise.allSettled([order(seller, c, "SELL", "10", "8"), order(seller, c, "SELL", "10", "8")]);
  assert.equal(shareRace.filter(r => r.status === "fulfilled").length, 1, "Concurrent sells cannot reserve the same shares twice.");
  const d = await candidate("matching"); await claimScoutTestInventory(seller2, d);
  const competingAsk = await order(seller2, d, "SELL", "10", "2");
  await Promise.all([order(buyer, d, "BUY", "10", "2"), order(buyer2, d, "BUY", "10", "2")]);
  const sold = await prisma.scoutFill.aggregate({ where: { sellOrderId: competingAsk.id }, _sum: { quantity: true } }); assert.equal(Number(sold._sum.quantity), 2, "Competing buyers cannot consume inventory twice.");
  const sameKey = randomUUID(); const dup = await Promise.all([order(raceUser, b, "BUY", "1", "3", sameKey), order(raceUser, b, "BUY", "1", "3", sameKey)]); assert.equal(dup[0].id, dup[1].id);
  await applyAdminAction(admin, "FREEZE", raceUser, "Customer matching acceptance freeze");
  assert.equal(Number((await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: raceUser } })).reservedCash), 0);
  await assert.rejects(order(raceUser, b, "BUY", "1", "3"), /paused/);
  await applyAdminAction(admin, "HALT_ATHLETE", c, "Customer matching acceptance halt");
  assert.equal(Number((await prisma.scoutPosition.findUniqueOrThrow({ where: { userId_athleteId: { userId: seller, athleteId: c } } })).reservedQuantity), 0);
  await assert.rejects(order(buyer, c, "BUY", "10", "1"), /not open/);
  await applyAdminAction(admin, "PAUSE_SANDBOX", "global", "Customer matching acceptance pause");
  await assert.rejects(order(buyer, a, "BUY", "10", "1"), /paused/);
  const outstanding = await prisma.scoutOrder.findFirstOrThrow({ where: { userId: { in: [buyer, buyer2] }, status: "OPEN" } }); await cancelScoutOrder(outstanding.userId, outstanding.id);
  await applyAdminAction(admin, "RESUME_SANDBOX", "global", "Customer matching acceptance resume");
  const revokedOrder = await order(seller2, a, "SELL", "15", "1");
  await reviewSandboxIdentity(admin, seller2, "REJECTED", "", "Customer matching acceptance revocation");
  assert.equal((await prisma.scoutOrder.findUniqueOrThrow({ where: { id: revokedOrder.id } })).status, "CANCELED");
  const cashKey = randomUUID(); await transferScoutTestCash(buyer, "DEPOSIT", "10", cashKey); await transferScoutTestCash(buyer, "DEPOSIT", "10", cashKey);
  assert.equal(await prisma.scoutCashTransfer.count({ where: { userId: buyer, requestKey: cashKey } }), 1);
  const token = randomBytes(32).toString("hex"); await prisma.session.create({ data: { userId: buyer, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
  const response = await fetch(base + "/api/real-market/test/actions", { method: "POST", headers: { cookie: `nax_session=${token}`, origin: new URL(base).origin, accept: "application/json", "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "ORDER", athleteId: b, side: "BUY", price: "1", quantity: "3", requestKey: randomUUID() }) });
  assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.status, "OPEN");
  assert.equal((await fetch(base + "/real-market/test", { headers: { cookie: `nax_session=${token}` } })).status, 200);
  assert.equal((await fetch(base + "/api/real-market/test/actions", { method: "POST", headers: { origin: "https://attacker.test", "content-type": "application/x-www-form-urlencoded" }, body: "action=CASH" })).status, 403);
  const e = await candidate("rounding"); await claimScoutTestInventory(seller, e);
  await order(seller, e, "SELL", "3.33", "1");
  const beforeRounding = await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: buyer } });
  await order(buyer, e, "BUY", "3.33", "0.99");
  const afterRounding = await prisma.scoutWallet.findUniqueOrThrow({ where: { userId: buyer } });
  assert.ok(beforeRounding.balance.sub(afterRounding.balance).eq("5.29"), "Fractional notional is settled to cents and unused cash backing is released.");
  const f = await candidate("cancel-race"); await claimScoutTestInventory(seller, f);
  const raceAsk = await order(seller, f, "SELL", "10", "1");
  await Promise.all([cancelScoutOrder(seller, raceAsk.id), order(buyer2, f, "BUY", "10", "1")]);
  const raceFills = await prisma.scoutFill.aggregate({ where: { sellOrderId: raceAsk.id }, _sum: { quantity: true } }); assert.ok(new Prisma.Decimal(raceFills._sum.quantity || 0).lte(1));
  await beginSandboxCareerEndingRetirement(b, "Customer test retirement event");
  assert.equal(await prisma.scoutOrder.count({ where: { athleteId: b, status: { in: ["OPEN", "PARTIAL"] } } }), 0, "Retirement releases customer order backing without promising a customer redemption.");
  const allFills = await prisma.scoutFill.findMany({ where: { buyOrder: { userId: { in: users } } } });
  const fees = allFills.reduce((n, f) => n.add(f.buyFee).add(f.sellFee), new Prisma.Decimal(0));
  const balances = await prisma.scoutWallet.aggregate({ where: { userId: { in: users } }, _sum: { balance: true } });
  const transfers = await prisma.scoutCashTransfer.findMany({ where: { userId: { in: users } } });
  const funding = transfers.reduce((n, t) => t.type === "DEPOSIT" ? n.add(t.amount) : n.sub(t.amount), new Prisma.Decimal(0));
  assert.ok(balances._sum.balance!.add(fees).eq(funding), "Customer cash plus recorded platform fees must reconcile to net funding.");
  for (const userId of users) {
    const w = await prisma.scoutWallet.findUnique({ where: { userId } }); if (!w) continue;
    const sum = await prisma.scoutLedgerEntry.aggregate({ where: { userId }, _sum: { amount: true } }); assert.ok(w.balance.eq(sum._sum.amount || 0));
    const holds = await prisma.scoutOrder.aggregate({ where: { userId, status: { in: ["OPEN", "PARTIAL"] } }, _sum: { cashHold: true } }); assert.ok(w.reservedCash.eq(holds._sum.cashHold || 0));
  }
  for (const athleteId of athletes) {
    const total = await prisma.scoutPosition.aggregate({ where: { athleteId }, _sum: { quantity: true } });
    const grants = await prisma.scoutInventoryGrant.aggregate({ where: { athleteId }, _sum: { quantity: true } }); assert.ok(new Prisma.Decimal(total._sum.quantity || 0).eq(grants._sum.quantity || 0), "Trading cannot create or destroy shares.");
  }
  assert.equal(await prisma.realTrade.count({ where: { userId: { in: users } } }), 0, "Customer matching cannot use the legacy simulator.");
  assert.equal(await prisma.scoutWallet.count({ where: { environment: "LIVE" } }), 0);
  console.log("Customer matching acceptance: PASS (priority, partials, fees, holds, replay, concurrency, controls, API, cash/share conservation)");
}
async function cleanup() {
  await prisma.scoutFill.deleteMany({ where: { buyOrder: { userId: { in: users } } } });
  const where = { userId: { in: users } };
  await prisma.scoutOrder.deleteMany({ where });
  await Promise.all([prisma.scoutLedgerEntry.deleteMany({ where }), prisma.scoutCashTransfer.deleteMany({ where }), prisma.scoutInventoryGrant.deleteMany({ where }), prisma.scoutPosition.deleteMany({ where })]);
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.realMarketInstrument.deleteMany({ where: { athleteId: { in: athletes } } });
  await prisma.athlete.deleteMany({ where: { id: { in: athletes } } });
}
main().finally(async () => { await cleanup(); await prisma.$disconnect(); });
