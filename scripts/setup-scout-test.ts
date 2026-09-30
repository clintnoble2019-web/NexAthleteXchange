import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { syncSandboxRealMarketUniverse } from "../lib/liquidity-provider-sandbox";
import { claimScoutTestInventory, placeScoutOrder, transferScoutTestCash } from "../lib/scout-market";

async function main() {
  if (process.env.SCOUT_TEST_DATABASE !== "1") throw new Error("Set SCOUT_TEST_DATABASE=1 only for the isolated customer test database.");
  const password = process.env.SCOUT_TEST_PASSWORD || "";
  if (password.length < 12) throw new Error("Provide SCOUT_TEST_PASSWORD with at least 12 characters through a secret environment variable.");
  // A repeated deployment must not refill balances, reset orders, or unfreeze testers.
  if (await prisma.scoutOrder.count({ where: { requestKey: { in: ["setup-seller-order-v1", "setup-buyer-order-v1", "setup-resting-buy-v1"] } } }) === 3) {
    console.log("Existing customer test fixtures retained."); return;
  }
  for (const [index, position] of ["QB", "WR", "RB"].entries()) {
    await prisma.athlete.upsert({ where: { slug: `scout-sandbox-nfl-${position.toLowerCase()}` }, update: {}, create: { name: `Sandbox NFL ${position}`, slug: `scout-sandbox-nfl-${position.toLowerCase()}`, sport: "NFL", league: "NFL", team: "TEST", position, currentPrice: 30 + index, previousPrice: 30 + index, dataProvider: "sandbox-fixture" } });
  }
  await syncSandboxRealMarketUniverse();
  const instrument = await prisma.realMarketInstrument.findFirstOrThrow({ where: { environment: "SANDBOX", status: "ACTIVE", athlete: { active: true, marketEnabled: true, currentPrice: { gte: 3 } } }, include: { athlete: true }, orderBy: { athlete: { name: "asc" } } });
  const accounts = [];
  for (const name of ["scout_admin", "scout_buyer", "scout_seller"]) {
    const user = await prisma.user.upsert({ where: { email: `${name}@example.test` }, update: {}, create: {
      ...(name === "scout_admin" ? { id: "scout-test-admin" } : {}), username: name, email: `${name}@example.test`, passwordHash: await bcrypt.hash(password, 12),
      wallet: { create: { balance: 5000 } }, realEnrollment: { create: { status: "VERIFIED", environment: "SANDBOX", identityHash: createHash("sha256").update(`isolated-demo-${name}`).digest("hex"), providerRef: "TEST-FIXTURE-NOT-LIVE-KYC" } },
    } });
    await transferScoutTestCash(user.id, "DEPOSIT", 1000, `setup-cash-v1-${user.id}`);
    await claimScoutTestInventory(user.id, instrument.athleteId);
    accounts.push(user);
  }
  const [, buyer, seller] = accounts;
  const price = Number(instrument.athlete.currentPrice).toFixed(2);
  await placeScoutOrder({ userId: seller.id, athleteId: instrument.athleteId, side: "SELL", price, quantity: "3", requestKey: "setup-seller-order-v1" });
  await placeScoutOrder({ userId: buyer.id, athleteId: instrument.athleteId, side: "BUY", price, quantity: "1", requestKey: "setup-buyer-order-v1" });
  await placeScoutOrder({ userId: buyer.id, athleteId: instrument.athleteId, side: "BUY", price: (Number(price) * .9).toFixed(2), quantity: "1", requestKey: "setup-resting-buy-v1" });
  console.log("Customer test market ready: scout_admin, scout_buyer, scout_seller. Use the supplied test password; no live KYC or funds are enabled.");
  console.log("Opening athlete: " + instrument.athlete.name);
}
main().finally(() => prisma.$disconnect());
