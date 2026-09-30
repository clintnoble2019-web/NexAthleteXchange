export type LaunchSport = "NBA" | "MLB" | "NFL";

export const initialPricingConfig = {
  minPrice: 3,
  maxPrice: 56.5,
  curve: 2.15,
  noStatsPrice: { NBA: 8, MLB: 6, NFL: 7 } as Record<LaunchSport, number>,
  noStatsPerformance: { NBA: 48, MLB: 45, NFL: 46 } as Record<LaunchSport, number>
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueOrZero(value: unknown) {
  return numeric(value) ?? 0;
}

export function priceFromPercentile(percentile: number) {
  const p = clamp(percentile, 0, 1);
  const curved = Math.pow(p, initialPricingConfig.curve);
  return Number((initialPricingConfig.minPrice + curved * (initialPricingConfig.maxPrice - initialPricingConfig.minPrice)).toFixed(2));
}

export function performanceFromPercentile(percentile: number) {
  return Math.round(35 + clamp(percentile, 0, 1) * 63);
}

export function nbaPerformanceRawScore(stats: Record<string, unknown>) {
  const gp = numeric(stats.gp);
  const minutes = numeric(stats.min);
  const pts = numeric(stats.pts);
  const reb = numeric(stats.reb);
  const ast = numeric(stats.ast);
  const stl = numeric(stats.stl);
  const blk = numeric(stats.blk);
  const tov = numeric(stats.tov);
  const plusMinus = numeric(stats.plus_minus);

  if ([gp, minutes, pts, reb, ast, stl, blk].every((value) => value == null)) return null;

  const availability = gp == null ? 0.75 : 0.65 + 0.35 * clamp(gp / 30, 0, 1);
  const production =
    valueOrZero(pts) +
    valueOrZero(reb) * 0.72 +
    valueOrZero(ast) * 1.15 +
    valueOrZero(stl) * 2.2 +
    valueOrZero(blk) * 2.2 -
    valueOrZero(tov) * 0.75 +
    valueOrZero(plusMinus) * 0.18 +
    Math.min(4, valueOrZero(minutes) / 9);

  return production * availability;
}

export function mlbPerformanceRawScore(stats: Record<string, unknown>) {
  const battingWar = numeric(stats.batting_war);
  const pitchingWar = numeric(stats.pitching_war);
  const battingOps = numeric(stats.batting_ops);
  const homeRuns = numeric(stats.batting_hr);
  const stolenBases = numeric(stats.batting_sb);
  const pitchingEra = numeric(stats.pitching_era);
  const pitchingK9 = numeric(stats.pitching_k_per_9);
  const pitchingIp = numeric(stats.pitching_ip);
  const saves = numeric(stats.pitching_sv);

  if ([battingWar, pitchingWar, battingOps, homeRuns, stolenBases, pitchingEra, pitchingK9, pitchingIp, saves].every((value) => value == null)) {
    return null;
  }

  const totalWar = valueOrZero(battingWar) + valueOrZero(pitchingWar);
  const battingValue = valueOrZero(battingOps) * 5 + valueOrZero(homeRuns) * 0.06 + valueOrZero(stolenBases) * 0.04;
  const pitchingValue =
    (pitchingEra == null ? 0 : (5 - clamp(pitchingEra, 0, 8)) * 0.45) +
    valueOrZero(pitchingK9) * 0.16 +
    Math.min(2.5, valueOrZero(pitchingIp) / 80) +
    valueOrZero(saves) * 0.035;

  return totalWar * 12 + battingValue + pitchingValue;
}

export function nflPerformanceRawScore(stats: Record<string, unknown>) {
  const gamesPlayed = numeric(stats.games_played);
  const passingYards = numeric(stats.passing_yards);
  const passingTouchdowns = numeric(stats.passing_touchdowns);
  const passingInterceptions = numeric(stats.passing_interceptions);
  const rushingYards = numeric(stats.rushing_yards);
  const rushingTouchdowns = numeric(stats.rushing_touchdowns);
  const receptions = numeric(stats.receptions);
  const receivingYards = numeric(stats.receiving_yards);
  const receivingTouchdowns = numeric(stats.receiving_touchdowns);
  const rushingFumblesLost = numeric(stats.rushing_fumbles_lost);
  const receivingFumblesLost = numeric(stats.receiving_fumbles_lost);
  const totalPoints = numeric(stats.total_points);

  if ([
    gamesPlayed,
    passingYards,
    passingTouchdowns,
    rushingYards,
    rushingTouchdowns,
    receptions,
    receivingYards,
    receivingTouchdowns,
    totalPoints,
  ].every((value) => value == null)) return null;

  const fantasyLikeTotal =
    valueOrZero(passingYards) * 0.04 +
    valueOrZero(passingTouchdowns) * 4 -
    valueOrZero(passingInterceptions) * 2 +
    valueOrZero(rushingYards) * 0.1 +
    valueOrZero(rushingTouchdowns) * 6 +
    valueOrZero(receptions) +
    valueOrZero(receivingYards) * 0.1 +
    valueOrZero(receivingTouchdowns) * 6 -
    (valueOrZero(rushingFumblesLost) + valueOrZero(receivingFumblesLost)) * 2 +
    valueOrZero(totalPoints) * 0.35;

  const gp = Math.max(1, valueOrZero(gamesPlayed));
  const perGame = fantasyLikeTotal / gp;
  const availability = 0.65 + 0.35 * clamp(gp / 8, 0, 1);
  return perGame * availability;
}

export function buildPercentiles<T extends { rawScore: number | null }>(rows: T[]) {
  const withStats = rows
    .filter((row): row is T & { rawScore: number } => row.rawScore != null && Number.isFinite(row.rawScore))
    .sort((a, b) => a.rawScore - b.rawScore);

  const percentile = new Map<T, number>();
  if (withStats.length === 1) percentile.set(withStats[0], 1);
  else if (withStats.length > 1) {
    withStats.forEach((row, index) => percentile.set(row, index / (withStats.length - 1)));
  }
  return percentile;
}
