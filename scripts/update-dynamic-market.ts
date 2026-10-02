import { PrismaClient } from "@prisma/client";
import { runLiveMarketUpdate } from "../lib/market-engine";
import { runNhlLiveMarketUpdate } from "../lib/nhl-market-engine";

const prisma = new PrismaClient();

async function main() {
  const result = await runLiveMarketUpdate(prisma);
  const nhl = await runNhlLiveMarketUpdate(prisma);
  console.log("Updating dynamic NexPoints prices from live NBA, NFL, MLB, and NHL game stats...");
  console.log(`NBA: ${result.nba.tracked} players tracked, ${result.nba.moved} price changes across ${result.nba.liveGames} live/recent games.`);
  console.log(`NFL: ${result.nfl.tracked} players tracked, ${result.nfl.moved} price changes across ${result.nfl.liveGames} live/recent games.`);
  console.log(`MLB: ${result.mlb.tracked} players tracked, ${result.mlb.moved} price changes across ${result.mlb.liveGames} live/recent games.`);
  console.log(`NHL: ${nhl.tracked} players tracked, ${nhl.moved} price changes across ${nhl.liveGames} live/recent games.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
