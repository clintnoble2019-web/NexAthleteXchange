function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numeric(value: unknown) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function minutes(value: unknown) {
  if (typeof value === "string" && value.includes(":")) {
    const [whole, seconds] = value.split(":").map(Number);
    if (Number.isFinite(whole) && Number.isFinite(seconds)) return whole + seconds / 60;
  }
  return numeric(value);
}

export function nhlProductionScore(stats: Record<string, unknown>) {
  const playerType = String(stats.player_type ?? "").toLowerCase();
  const savePct = numeric(stats.save_pct ?? stats.savePctg);
  const shotsAgainst = numeric(stats.shots_against ?? stats.shotsAgainst);
  const saves = numeric(stats.saves);
  const goalsAgainst = numeric(stats.goals_against ?? stats.goalsAgainst);
  const isGoalie = playerType === "goalie" || shotsAgainst > 0 || savePct > 0;

  if (isGoalie) {
    const goalieActivity = shotsAgainst + saves + goalsAgainst;
    if (goalieActivity <= 0) return 0;
    const pctBonus = savePct > 0 ? (savePct - 0.9) * 35 : 0;
    const decision = String(stats.decision ?? "").toUpperCase();
    const decisionBonus = decision === "W" ? 1.5 : decision === "L" ? -0.75 : 0;
    return saves * 0.12 - goalsAgainst * 0.9 + pctBonus + decisionBonus + Math.min(1.5, minutes(stats.time_on_ice ?? stats.toi) / 40);
  }

  const goals = numeric(stats.goals);
  const assists = numeric(stats.assists);
  const shots = numeric(stats.shots_on_goal ?? stats.sog);
  const plusMinus = numeric(stats.plus_minus ?? stats.plusMinus);
  const hits = numeric(stats.hits);
  const blocks = numeric(stats.blocked_shots ?? stats.blockedShots);
  const takeaways = numeric(stats.takeaways);
  const giveaways = numeric(stats.giveaways);
  const penaltyMinutes = numeric(stats.penalty_minutes ?? stats.pim);
  const toi = minutes(stats.time_on_ice ?? stats.toi);

  if (goals + assists + shots + hits + blocks + takeaways + giveaways + penaltyMinutes + toi <= 0) return 0;
  return (
    goals * 4 +
    assists * 2.5 +
    shots * 0.35 +
    plusMinus * 0.35 +
    hits * 0.12 +
    blocks * 0.18 +
    takeaways * 0.3 -
    giveaways * 0.25 -
    penaltyMinutes * 0.08 +
    Math.min(1.5, toi / 14)
  );
}

export function calculateNhlLiveImpact(stats: Record<string, unknown>) {
  const score = nhlProductionScore(stats);
  if (score === 0) return 0;
  return clamp(score * 0.006, -0.06, 0.06);
}
