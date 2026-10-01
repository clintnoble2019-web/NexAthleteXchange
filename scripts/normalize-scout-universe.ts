import { PrismaClient, RealInstrumentStatus, RealMarketEnvironment, Sport } from "@prisma/client";
import { realMarket } from "../lib/real-market";
import { syncSandboxRealMarketUniverse } from "../lib/liquidity-provider-sandbox";

const prisma = new PrismaClient();

async function main() {
  if (process.env.SCOUT_TEST_DATABASE !== "1") {
    throw new Error("Universe normalization is limited to the isolated customer test database.");
  }

  const existing = await prisma.realMarketInstrument.findMany({
    where: {
      environment: RealMarketEnvironment.SANDBOX,
      status: { not: RealInstrumentStatus.RETIRED },
    },
    include: { athlete: true },
  });

  const validNflPositions = new Set<string>([...realMarket.launchUniverse.nflPositions]);
  const stale = existing.filter((instrument) =>
    !instrument.athlete.active ||
    !instrument.athlete.marketEnabled ||
    (instrument.athlete.sport === Sport.NFL && !validNflPositions.has(instrument.athlete.position)),
  );

  for (const instrument of stale) {
    await prisma.realMarketInstrument.update({
      where: { id: instrument.id },
      data: {
        status: RealInstrumentStatus.RETIRED,
        retirementDeadline: null,
        retirementReason: "Removed from the isolated 72-athlete test universe because the Free Market athlete is no longer eligible.",
      },
    });
  }

  if (stale.length) {
    console.log(`Retired ${stale.length} stale legacy sandbox instruments before rebuilding the 72-athlete universe.`);
  }

  const universe = await syncSandboxRealMarketUniverse();
  for (const sport of realMarket.launchUniverse.sports) {
    const count = Number(universe[sport] || 0);
    if (count !== realMarket.launchUniverse.perSport) {
      throw new Error(`${sport} Real Market universe has ${count} eligible instruments after normalization; expected ${realMarket.launchUniverse.perSport}.`);
    }
  }

  console.log("Legacy universe normalized. Ready to seed 24 NBA, 24 NFL, and 24 MLB sandbox collectibles.");
}

main().finally(() => prisma.$disconnect());
