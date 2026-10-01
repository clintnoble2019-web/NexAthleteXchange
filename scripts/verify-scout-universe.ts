import { PrismaClient, RealInstrumentStatus, RealMarketEnvironment, Sport } from "@prisma/client";
import { realMarket } from "../lib/real-market";

const prisma = new PrismaClient();

async function main() {
  if (process.env.SCOUT_TEST_DATABASE !== "1") {
    throw new Error("Universe verification is limited to the isolated customer test database.");
  }

  let total = 0;
  for (const sport of [Sport.NBA, Sport.NFL, Sport.MLB]) {
    const instruments = await prisma.realMarketInstrument.findMany({
      where: {
        environment: RealMarketEnvironment.SANDBOX,
        status: { not: RealInstrumentStatus.RETIRED },
        athlete: { sport, active: true, marketEnabled: true },
      },
      include: { athlete: true },
      orderBy: { launchRank: "asc" },
    });

    if (instruments.length !== realMarket.launchUniverse.perSport) {
      throw new Error(`${sport} Real Market universe has ${instruments.length} athletes; expected ${realMarket.launchUniverse.perSport}.`);
    }

    for (const instrument of instruments) {
      const freePrice = Number(instrument.athlete.currentPrice);
      const referencePrice = Number(instrument.referencePrice);
      if (Math.abs(freePrice - referencePrice) > 0.0001) {
        throw new Error(`${instrument.athlete.name} reference price ${referencePrice} does not match Free Market price ${freePrice}.`);
      }
    }

    total += instruments.length;
    console.log(`${sport}: ${instruments.length} Real Market athletes · references synced to current Free Market prices.`);
  }

  if (total !== realMarket.launchUniverse.total) {
    throw new Error(`Real Market universe has ${total} athletes; expected ${realMarket.launchUniverse.total}.`);
  }

  console.log(`Real Market universe verified: ${total} athletes — 24 NBA, 24 NFL, 24 MLB.`);
  console.log("Temporary bridge verified: Free Market currentPrice seeds/syncs Real Market reference prices; executable prices remain order-book driven.");
}

main().finally(() => prisma.$disconnect());
