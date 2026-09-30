import { PrismaClient, Sport } from "@prisma/client";
import {
  getBdlMlbLiveStats,
  getBdlMlbSeasonStats,
  getBdlNbaLiveStats,
  getBdlNbaSeasonAverages,
  type BdlLivePlayerStat,
} from "./balldontlie";
import {
  buildPercentiles,
  mlbPerformanceRawScore,
  nbaPerformanceRawScore,
  performanceFromPercentile,
  priceFromPercentile,
  type LaunchSport,
} from "./initial-pricing";
import {
  calculateDailyBoundedTargetPrice,
  calculateMlbLiveImpact,
  calculateNbaLiveImpact,
  startOfUtcDay,
} from "./live-pricing";
import { gamePerformanceValue, lifetimePerformanceMarketCap } from "./market-cap";

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

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function liveDateWindow(now = new Date()) {
  const today = dateKey(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return { today, yesterday: dateKey(yesterdayDate), dates: [dateKey(yesterdayDate), today] };
}

async function ensureDailyOpen(
  prisma: PrismaClient,
  athletes: Array<{ id: string; currentPrice: unknown }>,
  now: Date,
) {
  if (athletes.length === 0) return new Map<string, number>();
  const source = `market-open-${dateKey(now)}`;
  const dayStart = startOfUtcDay(now);
  const ids = athletes.map((athlete) => athlete.id);
  const rows = await prisma.priceSnapshot.findMany({
    where: { athleteId: { in: ids }, source, createdAt: { gte: dayStart } },
    select: { athleteId: true, price: true },
  });
  const openByAthlete = new Map(rows.map((row) => [row.athleteId, Number(row.price)]));
  const missing = athletes.filter((athlete) => !openByAthlete.has(athlete.id));

  if (missing.length > 0) {
    await prisma.priceSnapshot.createMany({
      data: missing.map((athlete) => ({
        athleteId: athlete.id,
        price: Number(athlete.currentPrice),
        source,
      })),
    });
    for (const athlete of missing) openByAthlete.set(athlete.id, Number(athlete.currentPrice));
  }

  return openByAthlete;
}

async function updateSeasonBaselineSport(prisma: PrismaClient, sport: LaunchSport, season: number, now: Date) {
  const prismaSport = Sport[sport];
  const source = `season-balldontlie-${sport.toLowerCase()}-${season}-${dateKey(now)}`;
  const dayStart = startOfUtcDay(now);
  const athletes = await prisma.athlete.findMany({
    where: { sport: prismaSport, active: true, marketEnabled: true, dataProvider: "balldontlie" },
    orderBy: { name: "asc" },
  });

  if (athletes.length === 0) return { sport, updated: 0, moved: 0, noStats: 0, skipped: 0 };

  const alreadyUpdated = new Set(
    (await prisma.priceSnapshot.findMany({
      where: { athleteId: { in: athletes.map((athlete) => athlete.id) }, source, createdAt: { gte: dayStart } },
      select: { athleteId: true },
    })).map((row) => row.athleteId),
  );

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

  const candidates = athletes.filter((athlete) => !alreadyUpdated.has(athlete.id) && percentileByAthleteId.has(athlete.id));
  const openByAthlete = await ensureDailyOpen(prisma, candidates, now);
  const assignments = candidates.map((athlete) => {
    const percentile = percentileByAthleteId.get(athlete.id)!;
    const targetPrice = priceFromPercentile(percentile);
    const openPrice = openByAthlete.get(athlete.id) ?? Number(athlete.currentPrice);
    const nextPrice = calculateDailyBoundedTargetPrice(openPrice, targetPrice);
    const performance = performanceFromPercentile(percentile);
    return { athlete, nextPrice, performance };
  });

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
        data: { athleteId: assignment.athlete.id, price: assignment.nextPrice, source },
      }),
    ]);
    await prisma.$transaction(operations);
  }

  const moved = assignments.filter(({ athlete, nextPrice }) => Number(athlete.currentPrice) !== nextPrice).length;
  return {
    sport,
    updated: assignments.length,
    moved,
    noStats: athletes.length - percentileByAthleteId.size,
    skipped: alreadyUpdated.size,
  };
}

export async function runSeasonMarketUpdate(prisma: PrismaClient, now = new Date()) {
  const nbaSeason = seasonFromEnv("NEX_NBA_PRICING_SEASON", defaultNbaSeason(now));
  const mlbSeason = seasonFromEnv("NEX_MLB_PRICING_SEASON", defaultMlbSeason(now));
  const nba = await updateSeasonBaselineSport(prisma, "NBA", nbaSeason, now);
  const mlb = await updateSeasonBaselineSport(prisma, "MLB", mlbSeason, now);
  return { mode: "baseline" as const, nbaSeason, mlbSeason, nba, mlb };
}

function eligibleLiveRows(rows: BdlLivePlayerStat[], now: Date) {
  const { today, yesterday } = liveDateWindow(now);
  return rows.filter((row) => {
    if (row.statusState === "in_progress") return true;
    if (row.statusState !== "final") return false;
    if (row.gameDate === today) return true;
    return now.getUTCHours() < 10 && row.gameDate === yesterday;
  });
}

function latestRowPerPlayer(rows: BdlLivePlayerStat[]) {
  const latest = new Map<number, BdlLivePlayerStat>();
  for (const row of rows) {
    const existing = latest.get(row.playerId);
    if (!existing) {
      latest.set(row.playerId, row);
      continue;
    }
    const rowPriority = row.statusState === "in_progress" ? 2 : 1;
    const existingPriority = existing.statusState === "in_progress" ? 2 : 1;
    if (rowPriority > existingPriority || (rowPriority === existingPriority && row.gameId > existing.gameId)) {
      latest.set(row.playerId, row);
    }
  }
  return latest;
}

async function updateLiveSport(prisma: PrismaClient, sport: LaunchSport, season: number, now: Date) {
  const prismaSport = Sport[sport];
  const window = liveDateWindow(now);
  const rawRows = sport === "NBA"
    ? await getBdlNbaLiveStats(window.dates)
    : await getBdlMlbLiveStats(window.dates);
  const rowsByPlayer = latestRowPerPlayer(eligibleLiveRows(rawRows, now));
  if (rowsByPlayer.size === 0) return { sport, tracked: 0, moved: 0, liveGames: 0 };

  const playerIds = [...rowsByPlayer.keys()];
  const providerKeys = playerIds.map((playerId) => `bdl:${sport}:player:${playerId}`);
  const athletes = await prisma.athlete.findMany({
    where: {
      sport: prismaSport,
      active: true,
      marketEnabled: true,
      dataProvider: "balldontlie",
      providerKey: { in: providerKeys },
    },
  });
  if (athletes.length === 0) return { sport, tracked: 0, moved: 0, liveGames: 0 };

  const athleteByPlayerId = new Map<number, (typeof athletes)[number]>();
  for (const athlete of athletes) {
    const playerId = providerPlayerId(athlete.providerKey);
    if (playerId != null) athleteByPlayerId.set(playerId, athlete);
  }

  const seasonStatsByPlayer = sport === "NBA"
    ? new Map((await getBdlNbaSeasonAverages(season)).map((row) => [row.playerId, row.stats]))
    : new Map<number, Record<string, unknown>>();

  const openByAthlete = await ensureDailyOpen(prisma, athletes, now);
  const baselineRows = await prisma.priceSnapshot.findMany({
    where: {
      athleteId: { in: athletes.map((athlete) => athlete.id) },
      source: { startsWith: `season-balldontlie-${sport.toLowerCase()}-${season}-` },
      createdAt: { gte: startOfUtcDay(now) },
    },
    orderBy: { createdAt: "desc" },
    select: { athleteId: true, price: true },
  });
  const baselineByAthlete = new Map<string, number>();
  for (const row of baselineRows) {
    if (!baselineByAthlete.has(row.athleteId)) baselineByAthlete.set(row.athleteId, Number(row.price));
  }

  const assignments: Array<{
    athlete: (typeof athletes)[number];
    nextPrice: number;
    gameId: number;
    performanceValue: number;
    hasPriceMove: boolean;
  }> = [];
  const gameIds = new Set<number>();

  for (const [playerId, liveRow] of rowsByPlayer) {
    const athlete = athleteByPlayerId.get(playerId);
    if (!athlete) continue;

    const impact = sport === "NBA"
      ? calculateNbaLiveImpact(liveRow.stats, seasonStatsByPlayer.get(playerId))
      : calculateMlbLiveImpact(liveRow.stats);

    const openPrice = openByAthlete.get(athlete.id) ?? Number(athlete.currentPrice);
    const baselinePrice = baselineByAthlete.get(athlete.id) ?? openPrice;
    const liveTarget = baselinePrice * (1 + impact);
    const nextPrice = impact === 0
      ? Number(athlete.currentPrice)
      : calculateDailyBoundedTargetPrice(openPrice, liveTarget);
    const performanceValue = gamePerformanceValue(baselinePrice, impact);
    const hasPriceMove = Math.abs(nextPrice - Number(athlete.currentPrice)) >= 0.005;

    gameIds.add(liveRow.gameId);
    assignments.push({ athlete, nextPrice, gameId: liveRow.gameId, performanceValue, hasPriceMove });
  }

  for (let i = 0; i < assignments.length; i += 40) {
    const chunk = assignments.slice(i, i + 40);
    await prisma.$transaction(
      chunk.map((assignment) => prisma.performanceValueEvent.upsert({
        where: {
          athleteId_gameId: {
            athleteId: assignment.athlete.id,
            gameId: assignment.gameId,
          },
        },
        update: { value: assignment.performanceValue },
        create: {
          athleteId: assignment.athlete.id,
          sport: prismaSport,
          gameId: assignment.gameId,
          value: assignment.performanceValue,
        },
      })),
    );
  }

  const affectedAthleteIds = [...new Set(assignments.map((assignment) => assignment.athlete.id))];
  const totals = affectedAthleteIds.length > 0
    ? await prisma.performanceValueEvent.groupBy({
        by: ["athleteId"],
        where: { athleteId: { in: affectedAthleteIds } },
        _sum: { value: true },
      })
    : [];
  const marketCapByAthlete = new Map(
    totals.map((row) => [row.athleteId, lifetimePerformanceMarketCap([Number(row._sum.value ?? 0)])]),
  );

  for (let i = 0; i < assignments.length; i += 40) {
    const chunk = assignments.slice(i, i + 40);
    const operations = chunk.flatMap((assignment) => {
      const marketCap = marketCapByAthlete.get(assignment.athlete.id) ?? 0;
      if (!assignment.hasPriceMove) {
        return [prisma.athlete.update({
          where: { id: assignment.athlete.id },
          data: { marketCap },
        })];
      }

      return [
        prisma.athlete.update({
          where: { id: assignment.athlete.id },
          data: {
            previousPrice: assignment.athlete.currentPrice,
            currentPrice: assignment.nextPrice,
            marketCap,
          },
        }),
        prisma.priceSnapshot.create({
          data: {
            athleteId: assignment.athlete.id,
            price: assignment.nextPrice,
            source: `live-game-${sport.toLowerCase()}-${assignment.gameId}`,
          },
        }),
      ];
    });
    await prisma.$transaction(operations);
  }

  return {
    sport,
    tracked: rowsByPlayer.size,
    moved: assignments.filter((assignment) => assignment.hasPriceMove).length,
    liveGames: gameIds.size,
  };
}

export async function runLiveMarketUpdate(prisma: PrismaClient, now = new Date()) {
  const nbaSeason = seasonFromEnv("NEX_NBA_PRICING_SEASON", defaultNbaSeason(now));
  const mlbSeason = seasonFromEnv("NEX_MLB_PRICING_SEASON", defaultMlbSeason(now));
  const nba = await updateLiveSport(prisma, "NBA", nbaSeason, now);
  const mlb = await updateLiveSport(prisma, "MLB", mlbSeason, now);
  return { mode: "live" as const, nba, mlb };
}
