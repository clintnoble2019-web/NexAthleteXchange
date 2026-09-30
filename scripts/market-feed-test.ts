import assert from "node:assert/strict";
import { test } from "node:test";
import { getBdlMlbLiveStats } from "../lib/balldontlie";
import { calculateMlbLiveImpact } from "../lib/live-pricing";

test("MLB live feed includes postseason games and retains lifecycle metadata", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.BALLDONTLIE_API_KEY;
  process.env.BALLDONTLIE_API_KEY = "fixture-key";
  const statsCalls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/games")) {
      assert.equal(url.searchParams.has("season_type"), false, "Regular-only filtering excludes playoff games");
      assert.deepEqual(url.searchParams.getAll("dates[]"), ["2026-09-29", "2026-09-30"]);
      return Response.json({ data: [
        { id: 15467364, date: "2026-09-30T18:00:00.000Z", postseason: true, status_state: "in_progress" },
        { id: 15457180, date: "2026-09-29T18:00:00.000Z", postseason: true, status_state: "final" },
        { id: 10, status_state: "scheduled" }, { id: 11, status_state: "postponed" },
        { id: 12, status_state: "unknown" },
      ] });
    }
    statsCalls.push(...url.searchParams.getAll("game_ids[]"));
    return Response.json({ data: [
      { player: { id: 515 }, game_id: 15467364, at_bats: 5, hits: 2, hr: 1, rbi: 2, runs: 1, k: 1 },
      { player: { id: 736 }, game_id: 15457180, ip: 6.1, p_hits: 4, er: 3, p_bb: 1, p_k: 9, p_hr: 0 },
    ] });
  };
  try {
    const rows = await getBdlMlbLiveStats(["2026-09-29", "2026-09-30"]);
    assert.deepEqual(statsCalls, ["15467364", "15457180"]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].statusState, "in_progress");
    assert.equal(rows[0].gameDate, "2026-09-30");
    assert.equal(rows[1].statusState, "final");
    assert.ok(calculateMlbLiveImpact(rows[0].stats) > 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.BALLDONTLIE_API_KEY;
    else process.env.BALLDONTLIE_API_KEY = originalKey;
  }
});

test("MLB provider batting and pitching field names affect performance correctly", () => {
  const providerPitcher = { ip: 6.1, p_hits: 4, er: 3, p_bb: 1, p_k: 9, p_hr: 0 };
  const canonicalPitcher = { ip: 6.1, p_hits: 4, earned_runs: 3, p_walks: 1, p_strikeouts: 9, home_runs_allowed: 0 };
  assert.equal(calculateMlbLiveImpact(providerPitcher), calculateMlbLiveImpact(canonicalPitcher));
  assert.ok(calculateMlbLiveImpact({ ip: 1, p_hits: 5, er: 5, p_bb: 3, p_k: 0, p_hr: 2 }) < 0);
  assert.equal(calculateMlbLiveImpact({ at_bats: 4, hits: 0, k: 3 }), calculateMlbLiveImpact({ at_bats: 4, hits: 0, strikeouts: 3 }));
  assert.equal(calculateMlbLiveImpact({ at_bats: null, ip: null, k: null, p_k: null }), 0);
});
