import { PrismaClient, Sport } from "@prisma/client";
import { getBdlMlbSeasonStats, getBdlNbaSeasonAverages } from "../lib/balldontlie";
import {
  buildPercentiles,
  mlbPerformanceRawScore,
  nbaPerformanceRawScore,
  performanceFromPercentile,
  priceFromPercentile,
  type LaunchSport,
} from "../lib/initial-pricing";
import { calculateBoundedTargetPrice, startOfUtcDay } from "../lib/live-pricing";

const prisma = new PrismaClient();

function providerPlayerId(providerKey: string | null) {
  if (!providerKey) return null;
  const match = providerKey.match(/^bdl:(NBA|MLB):player:(\d+)$/);
  return match ? Number(match[2]) : null;
}

function defaultNbaSeason(now = new Date()) {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 10 ? year : year - 1;
}

function defaultMlbSeason(now = new Date()) {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 2 ? year : year - 1;
}

function seasonFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) throw new Error(`${name} must be a valid season year`);
  return parsed;
}

async function updateSport(sport: LaunchSport, season: number) {
  const prismaSport = Sport[sport];
  const source = `live-balldontlie-${sport.toLowerCase()}-${season}`;
  const force = process.env.NEX_FORCE_REPRICE === "1";
  const dayStart = startOfUtcDay();

  const athletes = await prisma.athlete.findMany({
    where: {
      sport: prismaSport,
      active: true,
      marketEnabled: true,
      dataProvider: "balldontlie",
    },
    orderBy: { name: "asc" },
  });

  if (athletes.length === 0) {
    console.log(`${sport}: no active BALLDONTLIE market players found.`);
    return;
  }

  const statsRows = sport === "NBA"
    ? await getBdlNbaSeasonAverages(season)
    : await getBdlMlbSeasonStats(season);
  const statsByPlayer = new Map(statsRows.map((row) => [row.playerId, row.stats]));

  const ranked = athletes.map((athlete) => {
    const playerId = providerPlayerId(athlete.providerKey);
    const stats = playerId == null ? undefined : statsByPlayer.get(playerId);
    const rawScore = stats
      ? (sport === "NBA" ? nbaPerformanceRawScore(stats) : mlbPerformanceRawScore(stats))
      : null;
    return { athlete, rawScore };
  });

  const percentileMap = buildPercentiles(ranked);
  const percentileByAthleteId = new Map<string, number>();
  for (const row of ranked) {
    const percentile = percentileMap.get(row);
    if (percentile != null) percentileByAthleteId.set(row.athlete.id, percentile);
  }

  const alreadyUpdated = force ? new Set<string>() : new Set(
    (await prisma.priceSnapshot.findMany({
      where: {
        athleteId: { in: athletes.map((athlete) => athlete.id) },
        source,
        createdAt: { gte: dayStart },
      },
      select: { athleteId: true },
    })).map((row) => row.athleteId)
  );

  const assignments = athletes.flatMap((athlete) => {
    if (alreadyUpdated.has(athlete.id)) return [];
    const percentile = percentileByAthleteId.get(athlete.id);
    if (percentile == null) return [];

    const targetPrice = priceFromPercentile(percentile);
    const nextPrice = calculateBoundedTargetPrice(Number(athlete.currentPrice), targetPrice);
    const performance = performanceFromPercentile(percentile);
    return [{ athlete, nextPrice, performance, targetPrice }];
  });

  // Use Prisma's batch transaction API so hosted Postgres latency cannot expire
  // a callback-style interactive transaction while repricing a full roster.
  for (let i = 0; i < assignments.length; i += 40) {
    const chunk = assignments.slice(i, i + 40);
    const operations = chunk.flatMap((assignment) => [
      prisma.athlete.update({
        where: { id: assignment.athlete.id },
        data: {
          previousPrice: assignment.athlete.currentPrice,
          currentPrice: assignment.nextPrice,
          performance: assignment.performance,
        },
      }),
      prisma.priceSnapshot.create({
        data: {
          athleteId: assignment.athlete.id,
          price: assignment.nextPrice,
          source,
        },
      }),
    ]);
    await prisma.$transaction(operations);
  }

  const noStats = athletes.length - percentileByAthleteId.size;
  const moved = assignments.filter(({ athlete, nextPrice }) => Number(athlete.currentPrice) !== nextPrice).length;
  console.log(`${sport}: ${assignments.length} players repriced, ${moved} price changes, ${alreadyUpdated.size} already updated today, ${noStats} without current stats.`);
}

async function main() {
  const nbaSeason = seasonFromEnv("NEX_NBA_PRICING_SEASON", defaultNbaSeason());
  const mlbSeason = seasonFromEnv("NEX_MLB_PRICING_SEASON", defaultMlbSeason());
  console.log(`Updating live NexPoints market from NBA ${nbaSeason} and MLB ${mlbSeason} regular-season stats...`);
  await updateSport("NBA", nbaSeason);
  await updateSport("MLB", mlbSeason);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
