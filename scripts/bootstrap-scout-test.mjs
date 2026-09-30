import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";

if (process.env.SCOUT_TEST_DATABASE !== "1") throw new Error("Bootstrap is only for the explicitly isolated customer test database.");

const prisma = new PrismaClient();
let initialized;
try {
  initialized = await prisma.scoutOrder.count({
    where: {
      user: { email: { in: ["scout_buyer@example.test", "scout_seller@example.test"] } },
      requestKey: { in: ["setup-seller-order-v1", "setup-buyer-order-v1", "setup-resting-buy-v1"] },
    },
  }) === 3;
} finally {
  await prisma.$disconnect();
}

const scripts = initialized
  ? ["scripts/setup-scout-test.ts"]
  : ["prisma/seed.ts", "scripts/setup-scout-test.ts"];

if (initialized) console.log("Existing customer fixtures retained; refreshing fixed supply and NEX House liquidity.");

for (const script of scripts) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], { env: process.env, stdio: "inherit" });
  if (result.status !== 0) throw new Error("Test bootstrap failed in " + script);
}
