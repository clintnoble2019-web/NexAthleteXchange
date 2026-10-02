import assert from "node:assert/strict";
import { getNhlActivePlayers, getNhlSeasonStats, getNhlTeams } from "../lib/nhl";
import { nhlPerformanceRawScore } from "../lib/initial-pricing";
import { calculateNhlLiveImpact } from "../lib/nhl-live-pricing";

async function main() {
  const teams = await getNhlTeams();
  assert.ok(teams.length >= 30, `Expected at least 30 NHL teams, got ${teams.length}`);
  assert.ok(teams.every((team) => team.id && team.abbreviation), "Every NHL team must have a stable provider ID and abbreviation");

  const players = await getNhlActivePlayers();
  assert.ok(players.length >= 600, `Expected at least 600 active NHL players, got ${players.length}`);
  assert.ok(players.every((player) => Number.isInteger(player.id) && player.team.abbreviation), "Every NHL player must map to a team");

  const priorSeason = await getNhlSeasonStats(2025);
  assert.ok(priorSeason.length >= 500, `Expected established 2025-26 NHL stats, got ${priorSeason.length} rows`);

  const eliteSkater = nhlPerformanceRawScore({
    player_type: "skater",
    games_played: 82,
    goals: 55,
    assists: 75,
    points: 130,
    points_per_game: 1.585,
    plus_minus: 28,
    shots: 330,
    shooting_pct: 0.167,
    time_on_ice_per_game: 1320,
  });
  const depthSkater = nhlPerformanceRawScore({
    player_type: "skater",
    games_played: 70,
    goals: 8,
    assists: 14,
    points: 22,
    points_per_game: 0.314,
    plus_minus: -10,
    shots: 95,
    shooting_pct: 0.084,
    time_on_ice_per_game: 780,
  });
  assert.ok((eliteSkater ?? 0) > (depthSkater ?? 0), "Elite skaters should rank above depth skaters");

  const eliteGoalie = nhlPerformanceRawScore({
    player_type: "goalie",
    games_played: 58,
    wins: 38,
    save_pct: 0.925,
    goals_against_average: 2.2,
    shutouts: 6,
  });
  const poorGoalie = nhlPerformanceRawScore({
    player_type: "goalie",
    games_played: 45,
    wins: 15,
    save_pct: 0.89,
    goals_against_average: 3.7,
    shutouts: 1,
  });
  assert.ok((eliteGoalie ?? 0) > (poorGoalie ?? 0), "Elite goalies should rank above poor goalies");

  const skaterImpact = calculateNhlLiveImpact({
    player_type: "skater",
    goals: 2,
    assists: 1,
    sog: 5,
    plusMinus: 2,
    hits: 2,
    blockedShots: 1,
    toi: "19:30",
  });
  assert.ok(skaterImpact > 0 && skaterImpact <= 0.06, `Expected positive capped skater impact, got ${skaterImpact}`);

  const goalieImpact = calculateNhlLiveImpact({
    player_type: "goalie",
    saves: 35,
    shotsAgainst: 37,
    goalsAgainst: 2,
    savePctg: 0.946,
    decision: "W",
    toi: "60:00",
  });
  assert.ok(goalieImpact > 0 && goalieImpact <= 0.06, `Expected positive capped goalie impact, got ${goalieImpact}`);

  console.log(`NHL smoke test passed: ${teams.length} teams, ${players.length} active players, ${priorSeason.length} prior-season stat rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
