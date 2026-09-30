import { PrismaClient } from "@prisma/client";
import { runLiveMarketUpdate } from "../lib/market-engine";

const prisma = new PrismaClient();

async function main() {
  const result = await runLiveMarketUpdate(prisma);
  console.log("Updating dynamic NexPoints prices from live NBA and MLB game stats...");
  console.log(`NBA: ${result.nba.tracked} players tracked, ${result.nba.moved} price changes across ${result.nba.liveGames} live/recent games.`);
  console.log(`MLB: ${result.mlb.tracked} players tracked, ${result.mlb.moved} price changes across ${result.mlb.liveGames} live/recent games.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
