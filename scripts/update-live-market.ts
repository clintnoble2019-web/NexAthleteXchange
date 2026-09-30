import { PrismaClient } from "@prisma/client";
import { runSeasonMarketUpdate } from "../lib/market-engine";

const prisma = new PrismaClient();

async function main() {
  const result = await runSeasonMarketUpdate(prisma);
  console.log(`Updating NexPoints season baseline from NBA ${result.nbaSeason}, MLB ${result.mlbSeason}, and NFL ${result.nflSeason} regular-season stats...`);
  console.log(`NBA: ${result.nba.updated} players repriced, ${result.nba.moved} price changes, ${result.nba.skipped} already updated today, ${result.nba.noStats} without current stats.`);
  console.log(`MLB: ${result.mlb.updated} players repriced, ${result.mlb.moved} price changes, ${result.mlb.skipped} already updated today, ${result.mlb.noStats} without current stats.`);
  console.log(`NFL: ${result.nfl.updated} players repriced, ${result.nfl.moved} price changes, ${result.nfl.skipped} already updated today, ${result.nfl.noStats} without current stats.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
