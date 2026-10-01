import {
  LiquidityQuoteStatus,
  PrismaClient,
  RealInstrumentStatus,
  RealMarketEnvironment,
  Sport,
} from "@prisma/client";
import { realMarket } from "../lib/real-market";
import { cancelScoutOrdersTx, scoutTransaction } from "../lib/scout-market";

const prisma = new PrismaClient();
const SANDBOX = RealMarketEnvironment.SANDBOX;

async function selectedFreeMarketAthletes(sport: Sport) {
  const athletes = await prisma.athlete.findMany({
    where: {
      sport,
      active: true,
      marketEnabled: true,
      ...(sport === Sport.NFL ? { position: { in: [...realMarket.launchUniverse.nflPositions] } } : {}),
    },
    orderBy: [{ marketCap: "desc" }, { currentPrice: "desc" }, { name: "asc" }],
    take: realMarket.launchUniverse.perSport,
  });
  if (athletes.length !== realMarket.launchUniverse.perSport) {
    throw new Error(`${sport} only has ${athletes.length} eligible Free Market athletes; ${realMarket.launchUniverse.perSport} are required.`);
  }
  return athletes;
}

async function main() {
  if (process.env.SCOUT_TEST_DATABASE !== "1") {
    throw new Error("Universe reconciliation is limited to the isolated customer test database.");
  }

  let total = 0;
  for (const sport of [Sport.NBA, Sport.NFL, Sport.MLB]) {
    const selected = await selectedFreeMarketAthletes(sport);
    const selectedIds = new Set(selected.map((athlete) => athlete.id));
    const existing = await prisma.realMarketInstrument.findMany({
      where: { environment: SANDBOX, athlete: { sport } },
      include: { athlete: true },
    });

    const removed = existing.filter((instrument) =>
      instrument.status !== RealInstrumentStatus.RETIRED && !selectedIds.has(instrument.athleteId),
    );

    for (const instrument of removed) {
      await scoutTransaction(async (tx) => {
        await cancelScoutOrdersTx(
          tx,
          { athleteId: instrument.athleteId },
          "Athlete removed from the current 72-athlete test universe.",
        );
      });
      await prisma.liquidityQuote.updateMany({
        where: { instrumentId: instrument.id, status: LiquidityQuoteStatus.ACTIVE },
        data: { status: LiquidityQuoteStatus.CANCELED },
      });
      await prisma.realMarketInstrument.update({
        where: { id: instrument.id },
        data: {
          status: RealInstrumentStatus.RETIRED,
          retirementDeadline: null,
          retirementReason: "Removed from the temporary 72-athlete sandbox universe during Free Market reconciliation.",
        },
      });
    }

    for (let index = 0; index < selected.length; index += 1) {
      const athlete = selected[index];
      const prior = existing.find((instrument) => instrument.athleteId === athlete.id);
      if (prior) {
        await prisma.realMarketInstrument.update({
          where: { id: prior.id },
          data: {
            status: RealInstrumentStatus.ACTIVE,
            referencePrice: athlete.currentPrice,
            frozenSettlementPrice: null,
            retirementDeadline: null,
            retirementReason: null,
            launchRank: index + 1,
          },
        });
      } else {
        await prisma.realMarketInstrument.create({
          data: {
            athleteId: athlete.id,
            environment: SANDBOX,
            status: RealInstrumentStatus.ACTIVE,
            referencePrice: athlete.currentPrice,
            launchRank: index + 1,
          },
        });
      }
    }

    const active = await prisma.realMarketInstrument.findMany({
      where: {
        environment: SANDBOX,
        status: RealInstrumentStatus.ACTIVE,
        athlete: { sport, active: true, marketEnabled: true },
      },
      include: { athlete: true },
      orderBy: { launchRank: "asc" },
    });

    if (active.length !== realMarket.launchUniverse.perSport) {
      throw new Error(`${sport} reconciliation produced ${active.length} active instruments; expected ${realMarket.launchUniverse.perSport}.`);
    }
    for (const instrument of active) {
      if (!selectedIds.has(instrument.athleteId)) {
        throw new Error(`${instrument.athlete.name} remained active outside the selected ${sport} Free Market universe.`);
      }
      if (Number(instrument.referencePrice) !== Number(instrument.athlete.currentPrice)) {
        throw new Error(`${instrument.athlete.name} Real Market reference does not match its current Free Market price.`);
      }
    }

    total += active.length;
    console.log(`${sport}: reconciled ${active.length} Real Market athletes from the current Free Market universe${removed.length ? `; retired ${removed.length} non-selected legacy instruments` : ""}.`);
  }

  if (total !== realMarket.launchUniverse.total) {
    throw new Error(`Reconciled ${total} Real Market athletes; expected ${realMarket.launchUniverse.total}.`);
  }
  console.log("Exact Real Market universe reconciled: 72 athletes — 24 NBA, 24 NFL, 24 MLB.");
  console.log("Temporary bridge: each selected instrument reference price equals the athlete's current Free Market price.");
}

main().finally(() => prisma.$disconnect());
