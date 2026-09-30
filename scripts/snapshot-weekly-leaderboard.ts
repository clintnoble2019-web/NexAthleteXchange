import { PrismaClient } from "@prisma/client";
import { snapshotWeeklyBaselines } from "../lib/competition";

const prisma = new PrismaClient();

async function main() {
  const result = await snapshotWeeklyBaselines();
  console.log(`Weekly scout baseline: ${result.created} users captured for ${result.weekStart.toISOString()}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
