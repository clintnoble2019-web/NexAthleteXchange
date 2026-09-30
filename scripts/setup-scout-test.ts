import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma";
import { syncSandboxRealMarketUniverse } from "../lib/liquidity-provider-sandbox";
import {
  REAL_MARKET_TERMS_ACTION,
  REAL_MARKET_TERMS_HASH,
  REAL_MARKET_TERMS_VERSION,
} from "../lib/real-market-compliance";
import {
  cancelScoutOrdersTx,
  claimScoutTestInventory,
  placeScoutOrder,
  scoutTransaction,
  transferScoutTestCash,
} from "../lib/scout-market";
import {
  houseQuoteLevels,
  scoutHouseUsername,
  scoutSupply,
  scoutSystemUsers,
} from "../lib/scout-supply";

const SYSTEM_USERNAMES = Object.values(scoutSystemUsers);

function systemIdentity(username: string) {
  return createHash("sha256").update(`nex-sandbox-system:${username}`).digest("hex");
}

async function ensureFixtureTerms(userId: string) {
  if (process.env.SCOUT_TEST_DATABASE !== "1") throw new Error("Fixture Terms acceptance is limited to the isolated customer test database.");
  const events = await prisma.adminAuditEvent.findMany({
    where: { actorId: userId, targetId: userId, action: REAL_MARKET_TERMS_ACTION },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const current = events.some(event => {
    const details = event.details as Record<string, unknown>;
    return details?.termsVersion === REAL_MARKET_TERMS_VERSION && details?.termsHash === REAL_MARKET_TERMS_HASH;
  });
  if (current) return;
  await prisma.adminAuditEvent.create({
    data: {
      actorId: userId,
      targetId: userId,
      action: REAL_MARKET_TERMS_ACTION,
      reason: "Isolated browser-test fixture accepted the current Real Market Terms.",
      details: {
        termsVersion: REAL_MARKET_TERMS_VERSION,
        termsHash: REAL_MARKET_TERMS_HASH,
        acceptedAt: new Date().toISOString(),
        country: "US",
        region: "TEST",
        ageConfirmed: true,
        agreementConfirmed: true,
        electronicConsent: true,
        locationConfirmed: true,
        riskConfirmed: true,
        productModel: "LIMITED_SUPPLY_DIGITAL_ATHLETE_COLLECTIBLES",
        fixtureOnly: true,
      },
    },
  });
}

async function ensureSystemUser(username: string, initialCash = 0) {
  const email = `${username}@system.example.test`;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        leaderboardEligible: false,
      },
    });
  } else if (user.leaderboardEligible) {
    user = await prisma.user.update({ where: { id: user.id }, data: { leaderboardEligible: false } });
  }

  await prisma.realEnrollment.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: "VERIFIED",
      environment: "SANDBOX",
      identityHash: systemIdentity(username),
      providerRef: "NEX-SANDBOX-SYSTEM",
    },
    update: {
      status: "VERIFIED",
      environment: "SANDBOX",
      providerRef: "NEX-SANDBOX-SYSTEM",
    },
  });

  await prisma.scoutWallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: initialCash },
    update: {},
  });
  return user;
}

async function ensureSystemPosition(userId: string, athleteId: string, quantity: number) {
  const existing = await prisma.scoutPosition.findUnique({ where: { userId_athleteId: { userId, athleteId } } });
  if (existing) return existing;
  return prisma.scoutPosition.create({ data: { userId, athleteId, quantity } });
}

async function ensureFixtureOrder(input: {
  userId: string;
  athleteId: string;
  side: "BUY" | "SELL";
  price: string;
  quantity: string;
  requestKey: string;
}) {
  const existing = await prisma.scoutOrder.findUnique({
    where: { userId_requestKey: { userId: input.userId, requestKey: input.requestKey } },
  });
  if (existing) return existing;
  return placeScoutOrder(input);
}

async function refreshHouseBook(
  houseUserId: string,
  athleteId: string,
  referencePrice: number,
  generation: string,
) {
  await scoutTransaction(tx => cancelScoutOrdersTx(
    tx,
    { userId: houseUserId, athleteId },
    "NEX House quote refresh",
  ));

  const levels = houseQuoteLevels(referencePrice);
  const orders = [
    { side: "SELL" as const, price: levels.ask1, quantity: levels.depth1, level: "ask1" },
    { side: "SELL" as const, price: levels.ask2, quantity: levels.depth2, level: "ask2" },
    { side: "BUY" as const, price: levels.bid1, quantity: levels.depth1, level: "bid1" },
    { side: "BUY" as const, price: levels.bid2, quantity: levels.depth2, level: "bid2" },
  ];

  for (const order of orders) {
    await placeScoutOrder({
      userId: houseUserId,
      athleteId,
      side: order.side,
      price: order.price.toFixed(2),
      quantity: String(order.quantity),
      requestKey: `nex_mm_${athleteId}_${generation}_${order.level}`,
    });
  }
}

async function main() {
  if (process.env.SCOUT_TEST_DATABASE !== "1") {
    throw new Error("Set SCOUT_TEST_DATABASE=1 only for the isolated customer test database.");
  }
  const password = process.env.SCOUT_TEST_PASSWORD || "";
  if (password.length < 12) {
    throw new Error("Provide SCOUT_TEST_PASSWORD with at least 12 characters through a secret environment variable.");
  }

  for (const [index, position] of ["QB", "WR", "RB"].entries()) {
    await prisma.athlete.upsert({
      where: { slug: `scout-sandbox-nfl-${position.toLowerCase()}` },
      update: {},
      create: {
        name: `Sandbox NFL ${position}`,
        slug: `scout-sandbox-nfl-${position.toLowerCase()}`,
        sport: "NFL",
        league: "NFL",
        team: "TEST",
        position,
        currentPrice: 30 + index,
        previousPrice: 30 + index,
        dataProvider: "sandbox-fixture",
      },
    });
  }

  await syncSandboxRealMarketUniverse();
  const instruments = await prisma.realMarketInstrument.findMany({
    where: { environment: "SANDBOX", status: "ACTIVE", athlete: { active: true, marketEnabled: true } },
    include: { athlete: true },
    orderBy: [{ athlete: { sport: "asc" } }, { launchRank: "asc" }],
  });
  if (!instruments.length) throw new Error("No active sandbox instruments are available for customer testing.");

  const systemUsers = new Map<string, Awaited<ReturnType<typeof ensureSystemUser>>>();
  for (const username of SYSTEM_USERNAMES) {
    const isHouse = username.startsWith("nex_house_");
    systemUsers.set(username, await ensureSystemUser(username, isHouse ? scoutSupply.houseCashPerSport : 0));
  }
  const systemIds = [...systemUsers.values()].map(user => user.id);

  // Seed the non-public supply buckets first. These positions are created once and then
  // move only through actual sandbox fills, so repeated deploys never mint replacement units.
  for (const instrument of instruments) {
    const house = systemUsers.get(scoutHouseUsername(instrument.athlete.sport));
    const reserve = systemUsers.get(scoutSystemUsers.liquidityReserve);
    const treasury = systemUsers.get(scoutSystemUsers.treasury);
    if (!house || !reserve || !treasury) throw new Error("Sandbox supply accounts are incomplete.");
    await ensureSystemPosition(house.id, instrument.athleteId, scoutSupply.housePerAthlete);
    await ensureSystemPosition(reserve.id, instrument.athleteId, scoutSupply.liquidityReservePerAthlete);
    await ensureSystemPosition(treasury.id, instrument.athleteId, scoutSupply.treasuryPerAthlete);
  }

  const openingInstrument = instruments.find(item => Number(item.athlete.currentPrice) >= 3) || instruments[0];
  const accounts = [];
  for (const name of ["scout_admin", "scout_buyer", "scout_seller"]) {
    const user = await prisma.user.upsert({
      where: { email: `${name}@example.test` },
      update: {},
      create: {
        ...(name === "scout_admin" ? { id: "scout-test-admin" } : {}),
        username: name,
        email: `${name}@example.test`,
        passwordHash: await bcrypt.hash(password, 12),
        wallet: { create: { balance: 5000 } },
        realEnrollment: {
          create: {
            status: "VERIFIED",
            environment: "SANDBOX",
            identityHash: createHash("sha256").update(`isolated-demo-${name}`).digest("hex"),
            providerRef: "TEST-FIXTURE-NOT-LIVE-KYC",
          },
        },
      },
    });
    await ensureFixtureTerms(user.id);
    await transferScoutTestCash(user.id, "DEPOSIT", 1000, `setup-cash-v1-${user.id}`);
    // Legacy fixture inventory is retained for the dedicated seller test account only.
    // It is counted inside the 20,000-unit public float below rather than added on top.
    await claimScoutTestInventory(user.id, openingInstrument.athleteId);
    accounts.push(user);
  }

  // Public float is the remainder of the 20,000-unit customer allocation after any
  // pre-existing tester positions. This keeps the total supply exactly 100,000 per athlete.
  const publicUser = systemUsers.get(scoutSystemUsers.publicFloat);
  if (!publicUser) throw new Error("Sandbox public-float account is missing.");
  for (const instrument of instruments) {
    const existingPublic = await prisma.scoutPosition.findUnique({
      where: { userId_athleteId: { userId: publicUser.id, athleteId: instrument.athleteId } },
    });
    if (!existingPublic) {
      const outsideSystem = await prisma.scoutPosition.aggregate({
        where: { athleteId: instrument.athleteId, userId: { notIn: systemIds } },
        _sum: { quantity: true },
      });
      const alreadyDistributed = Number(outsideSystem._sum.quantity || 0);
      const publicRemainder = scoutSupply.publicFloatPerAthlete - alreadyDistributed;
      if (publicRemainder < 0) {
        throw new Error(`${instrument.athlete.name} already has more than ${scoutSupply.publicFloatPerAthlete} customer units.`);
      }
      await ensureSystemPosition(publicUser.id, instrument.athleteId, publicRemainder);
    }
  }

  const [, buyer, seller] = accounts;
  const openingPrice = Number(openingInstrument.athlete.currentPrice).toFixed(2);
  await ensureFixtureOrder({
    userId: seller.id,
    athleteId: openingInstrument.athleteId,
    side: "SELL",
    price: openingPrice,
    quantity: "3",
    requestKey: "setup-seller-order-v1",
  });
  await ensureFixtureOrder({
    userId: buyer.id,
    athleteId: openingInstrument.athleteId,
    side: "BUY",
    price: openingPrice,
    quantity: "1",
    requestKey: "setup-buyer-order-v1",
  });
  await ensureFixtureOrder({
    userId: buyer.id,
    athleteId: openingInstrument.athleteId,
    side: "BUY",
    price: (Number(openingPrice) * 0.9).toFixed(2),
    quantity: "1",
    requestKey: "setup-resting-buy-v1",
  });

  const generation = Date.now().toString(36);
  for (const instrument of instruments) {
    const house = systemUsers.get(scoutHouseUsername(instrument.athlete.sport));
    if (!house) throw new Error(`Missing House market maker for ${instrument.athlete.sport}.`);
    await refreshHouseBook(house.id, instrument.athleteId, Number(instrument.referencePrice), generation);
  }

  for (const instrument of instruments) {
    const total = await prisma.scoutPosition.aggregate({
      where: { athleteId: instrument.athleteId },
      _sum: { quantity: true },
    });
    const issued = Number(total._sum.quantity || 0);
    if (Math.abs(issued - scoutSupply.totalPerAthlete) > 0.0001) {
      throw new Error(`${instrument.athlete.name} supply is ${issued}; expected ${scoutSupply.totalPerAthlete}.`);
    }
  }

  console.log(`Customer test market ready with ${scoutSupply.totalPerAthlete.toLocaleString()} units per athlete.`);
  console.log(`Supply: House ${scoutSupply.housePerAthlete.toLocaleString()}, public ${scoutSupply.publicFloatPerAthlete.toLocaleString()}, reserve ${scoutSupply.liquidityReservePerAthlete.toLocaleString()}, treasury ${scoutSupply.treasuryPerAthlete.toLocaleString()}.`);
  console.log("NEX House bid/ask liquidity refreshed for every active NBA, NFL, and MLB sandbox collectible.");
  console.log("Opening athlete: " + openingInstrument.athlete.name);
}

main().finally(() => prisma.$disconnect());
