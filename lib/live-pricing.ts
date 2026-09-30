export const livePricingConfig = {
  maxMovePct: 0.12,
  maxLiveImpactPct: 0.06,
  minPrice: 1,
  minNbaMinutesForLiveMove: 5,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function numeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "string" && value.includes(":")) {
    const [whole, seconds] = value.split(":");
    const min = Number(whole);
    const sec = Number(seconds);
    if (Number.isFinite(min) && Number.isFinite(sec)) return min + sec / 60;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumeric(stats: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = numeric(stats[key]);
    if (value != null) return value;
  }
  return 0;
}

export function calculateBoundedTargetPrice(currentPrice: number, targetPrice: number, maxMovePct = livePricingConfig.maxMovePct) {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) throw new Error("Current price must be positive.");
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) throw new Error("Target price must be positive.");
  if (!Number.isFinite(maxMovePct) || maxMovePct < 0 || maxMovePct > 1) throw new Error("Max move must be between 0 and 1.");

  const floor = Math.max(livePricingConfig.minPrice, currentPrice * (1 - maxMovePct));
  const ceiling = currentPrice * (1 + maxMovePct);
  const bounded = Math.max(floor, Math.min(ceiling, targetPrice));
  return roundMoney(bounded);
}

export function calculateDailyBoundedTargetPrice(openPrice: number, targetPrice: number, maxMovePct = livePricingConfig.maxMovePct) {
  return calculateBoundedTargetPrice(openPrice, targetPrice, maxMovePct);
}

export function nbaProductionScore(stats: Record<string, unknown>) {
  const minutes = firstNumeric(stats, ["min", "minutes"]);
  return (
    firstNumeric(stats, ["pts", "points"]) +
    firstNumeric(stats, ["reb", "rebounds"]) * 0.72 +
    firstNumeric(stats, ["ast", "assists"]) * 1.15 +
    firstNumeric(stats, ["stl", "steals"]) * 2.2 +
    firstNumeric(stats, ["blk", "blocks"]) * 2.2 -
    firstNumeric(stats, ["tov", "turnover", "turnovers"]) * 0.75 +
    firstNumeric(stats, ["plus_minus", "plusMinus"]) * 0.18 +
    Math.min(4, minutes / 9)
  );
}

export function calculateNbaLiveImpact(liveStats: Record<string, unknown>, seasonStats?: Record<string, unknown>) {
  const minutes = firstNumeric(liveStats, ["min", "minutes"]);
  if (minutes < livePricingConfig.minNbaMinutesForLiveMove) return 0;

  const expectedMinutes = Math.max(24, seasonStats ? firstNumeric(seasonStats, ["min", "minutes"]) : 30);
  const progress = clamp(minutes / expectedMinutes, 0.15, 1);
  const liveScore = nbaProductionScore(liveStats);
  const expectedScore = Math.max(8, seasonStats ? nbaProductionScore(seasonStats) : 24);
  const projectedScore = liveScore / progress;
  const relativePerformance = projectedScore / expectedScore - 1;
  return clamp(relativePerformance * 0.10 * progress, -livePricingConfig.maxLiveImpactPct, livePricingConfig.maxLiveImpactPct);
}

function parseBaseballInnings(value: unknown) {
  if (value == null || value === "") return 0;
  const text = String(value);
  const [wholeText, outsText] = text.split(".");
  const whole = Number(wholeText);
  const outs = Number(outsText ?? 0);
  if (!Number.isFinite(whole)) return 0;
  if (!Number.isFinite(outs) || outs < 0 || outs > 2) return whole;
  return whole + outs / 3;
}

export function calculateMlbLiveImpact(stats: Record<string, unknown>) {
  const atBats = firstNumeric(stats, ["at_bats", "ab", "batting_ab"]);
  const hits = firstNumeric(stats, ["hits", "h", "batting_h"]);
  const doubles = firstNumeric(stats, ["doubles", "2b", "batting_2b"]);
  const triples = firstNumeric(stats, ["triples", "3b", "batting_3b"]);
  const homeRuns = firstNumeric(stats, ["home_runs", "hr", "batting_hr"]);
  const rbi = firstNumeric(stats, ["rbi", "batting_rbi"]);
  const runs = firstNumeric(stats, ["runs", "r", "batting_r"]);
  const walks = firstNumeric(stats, ["walks", "bb", "batting_bb"]);
  const strikeouts = firstNumeric(stats, ["strikeouts", "k", "so", "batting_so"]);
  const stolenBases = firstNumeric(stats, ["stolen_bases", "sb", "batting_sb"]);
  const outsAtBat = Math.max(0, atBats - hits);

  const hitterScore =
    hits * 0.8 +
    doubles * 0.45 +
    triples * 0.9 +
    homeRuns * 1.8 +
    rbi * 0.3 +
    runs * 0.25 +
    walks * 0.3 +
    stolenBases * 0.65 -
    outsAtBat * 0.18 -
    strikeouts * 0.12;

  const innings = parseBaseballInnings(stats.ip ?? stats.pitching_ip);
  const pitchingStrikeouts = firstNumeric(stats, ["p_strikeouts", "p_k", "pitching_so", "pitching_k", "strikeouts_pitched"]);
  const earnedRuns = firstNumeric(stats, ["earned_runs", "er", "p_earned_runs", "pitching_er"]);
  const pitchingWalks = firstNumeric(stats, ["p_walks", "p_bb", "pitching_bb", "walks_allowed"]);
  const homeRunsAllowed = firstNumeric(stats, ["home_runs_allowed", "p_hr", "p_home_runs", "pitching_hr"]);
  const hitsAllowed = firstNumeric(stats, ["p_hits", "hits_allowed", "pitching_h"]);

  const pitcherScore =
    innings * 0.35 +
    pitchingStrikeouts * 0.18 -
    earnedRuns * 0.65 -
    pitchingWalks * 0.2 -
    homeRunsAllowed * 0.55 -
    hitsAllowed * 0.08;

  const hasHittingLine = atBats + walks > 0;
  const hasPitchingLine = innings > 0;
  if (!hasHittingLine && !hasPitchingLine) return 0;

  const impact = (hasHittingLine ? hitterScore * 0.015 : 0) + (hasPitchingLine ? pitcherScore * 0.015 : 0);
  return clamp(impact, -livePricingConfig.maxLiveImpactPct, livePricingConfig.maxLiveImpactPct);
}

export function nflProductionScore(stats: Record<string, unknown>) {
  return (
    firstNumeric(stats, ["passing_yards"]) * 0.04 +
    firstNumeric(stats, ["passing_touchdowns"]) * 4 -
    firstNumeric(stats, ["passing_interceptions"]) * 2 +
    firstNumeric(stats, ["rushing_yards"]) * 0.1 +
    firstNumeric(stats, ["rushing_touchdowns"]) * 6 +
    firstNumeric(stats, ["receptions"]) +
    firstNumeric(stats, ["receiving_yards"]) * 0.1 +
    firstNumeric(stats, ["receiving_touchdowns"]) * 6 -
    firstNumeric(stats, ["fumbles_lost"]) * 2 +
    firstNumeric(stats, ["total_tackles"]) * 0.08 +
    firstNumeric(stats, ["defensive_sacks"]) * 1.5 +
    firstNumeric(stats, ["tackles_for_loss"]) * 0.35 +
    firstNumeric(stats, ["passes_defended"]) * 0.4 +
    firstNumeric(stats, ["defensive_interceptions"]) * 3 +
    firstNumeric(stats, ["fumbles_recovered"]) * 2 +
    firstNumeric(stats, ["fumbles_touchdowns"]) * 6 +
    firstNumeric(stats, ["interception_touchdowns"]) * 6 +
    firstNumeric(stats, ["kick_return_touchdowns"]) * 6 +
    firstNumeric(stats, ["punt_return_touchdowns"]) * 6 +
    firstNumeric(stats, ["field_goals_made"]) * 3 +
    firstNumeric(stats, ["extra_points_made"])
  );
}

export function calculateNflLiveImpact(liveStats: Record<string, unknown>, seasonStats?: Record<string, unknown>) {
  const activity =
    firstNumeric(liveStats, ["passing_attempts"]) +
    firstNumeric(liveStats, ["rushing_attempts"]) +
    firstNumeric(liveStats, ["receiving_targets"]) +
    firstNumeric(liveStats, ["total_tackles"]) +
    firstNumeric(liveStats, ["field_goal_attempts"]) +
    firstNumeric(liveStats, ["punts"]);
  if (activity <= 0) return 0;

  const liveScore = nflProductionScore(liveStats);
  const game = liveStats.game && typeof liveStats.game === "object" ? liveStats.game as Record<string, unknown> : undefined;
  const statusState = String(game?.status_state ?? liveStats.status_state ?? "unknown").toLowerCase();

  if (statusState === "final" && seasonStats) {
    const gamesPlayed = Math.max(1, firstNumeric(seasonStats, ["games_played"]));
    const expected = Math.max(4, nflProductionScore(seasonStats) / gamesPlayed);
    const relativePerformance = liveScore / expected - 1;
    return clamp(relativePerformance * 0.05, -livePricingConfig.maxLiveImpactPct, livePricingConfig.maxLiveImpactPct);
  }

  const mistakes =
    firstNumeric(liveStats, ["passing_interceptions"]) +
    firstNumeric(liveStats, ["fumbles_lost"]);
  return clamp(liveScore * 0.0025 - mistakes * 0.004, -0.02, livePricingConfig.maxLiveImpactPct);
}

export function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
