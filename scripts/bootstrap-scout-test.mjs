import { PrismaClient, Sport } from "@prisma/client";
import { spawnSync } from "node:child_process";

if (process.env.SCOUT_TEST_DATABASE !== "1") throw new Error("Bootstrap is only for the explicitly isolated customer test database.");

const prisma = new PrismaClient();
let initialized;
let freeMarketNeedsHydration;
try {
  initialized = await prisma.scoutOrder.count({
    where: {
      user: { email: { in: ["scout_buyer@example.test", "scout_seller@example.test"] } },
      requestKey: { in: ["setup-seller-order-v1", "setup-buyer-order-v1", "setup-resting-buy-v1"] },
    },
  }) === 3;

  const [nbaCount, mlbCount, nflCount] = await Promise.all([
    prisma.athlete.count({
      where: { sport: Sport.NBA, active: true, marketEnabled: true, currentPrice: { gt: 0 } },
    }),
    prisma.athlete.count({
      where: { sport: Sport.MLB, active: true, marketEnabled: true, currentPrice: { gt: 0 } },
    }),
    prisma.athlete.count({
      where: {
        sport: Sport.NFL,
        active: true,
        marketEnabled: true,
        currentPrice: { gt: 0 },
        position: { in: ["QB", "WR", "RB"] },
      },
    }),
  ]);

  freeMarketNeedsHydration = nbaCount < 24 || mlbCount < 24 || nflCount < 24;
  console.log(`Free Market launch-depth check: NBA ${nbaCount}/24, NFL ${nflCount}/24, MLB ${mlbCount}/24.`);
} finally {
  await prisma.$disconnect();
}

const scripts = [];
if (!initialized) scripts.push("prisma/seed.ts");
if (freeMarketNeedsHydration) {
  scripts.push("scripts/sync-balldontlie.ts", "scripts/initialize-player-prices.ts");
}
scripts.push("scripts/normalize-scout-universe.ts", "scripts/setup-scout-test.ts", "scripts/verify-scout-universe.ts");

if (initialized) console.log("Existing customer fixtures retained; rebuilding the 72-athlete Real Market from the Free Market and refreshing NEX House liquidity.");
if (freeMarketNeedsHydration) {
  console.log("Free Market does not yet have 24 eligible priced athletes per sport; syncing real BALLDONTLIE rosters and running the Free Market pricing engine before Real Market reconciliation.");
}

for (const script of scripts) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], { env: process.env, stdio: "inherit" });
  if (result.status !== 0) throw new Error("Test bootstrap failed in " + script);
}
