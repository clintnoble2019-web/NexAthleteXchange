import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
if (process.env.SCOUT_TEST_DATABASE !== "1") throw new Error("Bootstrap is only for the explicitly isolated customer test database.");
const prisma = new PrismaClient();
let initialized;
try {
  initialized = await prisma.scoutOrder.count({ where: { requestKey: { in: ["setup-seller-order-v1", "setup-buyer-order-v1", "setup-resting-buy-v1"] } } }) === 3;
} finally { await prisma.$disconnect(); }
if (initialized) console.log("Existing test data preserved; bootstrap skipped.");
else for (const script of ["prisma/seed.ts", "scripts/setup-scout-test.ts"]) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], { env: process.env, stdio: "inherit" });
  if (result.status !== 0) throw new Error("Test bootstrap failed in " + script);
}
