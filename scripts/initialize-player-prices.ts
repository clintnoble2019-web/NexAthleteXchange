import { PrismaClient, Sport } from "@prisma/client";
import { getBdlMlbSeasonStats, getBdlNbaSeasonAverages, getBdlNflSeasonStats } from "../lib/balldontlie";
import {
  buildPercentiles,
  initialPricingConfig,
  mlbPerformanceRawScore,
  nbaPerformanceRawScore,
  nflPerformanceRawScore,
  performanceFromPercentile,
  priceFromPercentile,
  type LaunchSport
} from "../lib/initial-pricing";

const prisma = new PrismaClient();

function providerPlayerId(providerKey: string | null) {
  if (!providerKey) return null;
  const match = providerKey.match(/^bdl:(NBA|MLB|NFL):player:(\d+)$/);
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

function defaultNflSeason(now = new Date()) {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 7 ? year : year - 1;
}

function seasonFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) throw new Error(`${name} must be a valid season year`);
  return parsed;
}

async function statsForSport(sport: LaunchSport, season: number) {
  if (sport === "NBA") return getBdlNbaSeasonAverages(season);
  if (sport === "MLB") return getBdlMlbSeasonStats(season);
  return getBdlNflSeasonStats(season);
}

function rawScoreForSport(sport: LaunchSport, stats: Record<string, unknown>) {
  if (sport === "NBA") return nbaPerformanceRawScore(stats);
  if (sport === "MLB") return mlbPerformanceRawScore(stats);
  return nflPerformanceRawScore(stats);
}

async function priceSport(sport: LaunchSport, season: number) {
  const prismaSport = Sport[sport];
  const athletes = await prisma.athlete.findMany({
    where: { sport: prismaSport, active: true, dataProvider: "balldontlie" },
    orderBy: { name: "asc" }
  });
  const pending = athletes.filter((athlete) => !athlete.marketEnabled);

  if (pending.length === 0) {
    console.log(`${sport}: no unpriced active BALLDONTLIE players found.`);
    return;
  }

  const statsRows = await statsForSport(sport, season);
  const statsByPlayer = new Map(statsRows.map((row) => [row.playerId, row.stats]));

  const ranked = athletes.map((athlete) => {
    const playerId = providerPlayerId(athlete.providerKey);
    const stats = playerId == null ? undefined : statsByPlayer.get(playerId);
    const rawScore = stats ? rawScoreForSport(sport, stats) : null;
    return { athlete, playerId, rawScore };
  });

  const percentileMap = buildPercentiles(ranked);
  const percentileByAthleteId = new Map<string, number>();
  for (const row of ranked) {
    const percentile = percentileMap.get(row);
    if (percentile != null) percentileByAthleteId.set(row.athlete.id, percentile);
  }

  const assignments = pending.map((athlete) => {
    const percentile = percentileByAthleteId.get(athlete.id);
    const hasStats = percentile != null;
    return {
      athlete,
      hasStats,
      price: hasStats ? priceFromPercentile(percentile) : initialPricingConfig.noStatsPrice[sport],
      performance: hasStats ? performanceFromPercentile(percentile) : initialPricingConfig.noStatsPerformance[sport]
    };
  });

  for (let i = 0; i < assignments.length; i += 40) {
    const chunk = assignments.slice(i, i + 40);
    const operations = chunk.flatMap((assignment) => [
      prisma.athlete.update({
        where: { id: assignment.athlete.id },
        data: {
          currentPrice: assignment.price,
          previousPrice: assignment.price,
          performance: assignment.performance,
          marketEnabled: true
        }
      }),
      prisma.priceSnapshot.create({
        data: {
          athleteId: assignment.athlete.id,
          price: assignment.price,
          source: `initial-balldontlie-${sport.toLowerCase()}-${season}`
        }
      })
    ]);
    await prisma.$transaction(operations);
  }

  const statPriced = assignments.filter((assignment) => assignment.hasStats).length;
  const fallbackPriced = assignments.length - statPriced;
  const prices = assignments.map((assignment) => assignment.price);
  const min = Math.min(...prices).toFixed(2);
  const max = Math.max(...prices).toFixed(2);
  console.log(`${sport}: priced ${assignments.length} players for market. ${statPriced} performance-priced, ${fallbackPriced} fallback-priced. Range N⟡${min}–N⟡${max}.`);
}

async function main() {
  const nbaSeason = seasonFromEnv("NEX_NBA_PRICING_SEASON", defaultNbaSeason());
  const mlbSeason = seasonFromEnv("NEX_MLB_PRICING_SEASON", defaultMlbSeason());
  const nflSeason = seasonFromEnv("NEX_NFL_PRICING_SEASON", defaultNflSeason());
  console.log(`Initializing NexPoints prices using NBA ${nbaSeason}, MLB ${mlbSeason}, and NFL ${nflSeason} regular-season data...`);
  await priceSport("NBA", nbaSeason);
  await priceSport("MLB", mlbSeason);
  await priceSport("NFL", nflSeason);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
