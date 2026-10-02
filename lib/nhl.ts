export type NhlTeam = {
  id: number;
  name: string;
  abbreviation: string;
  city?: string;
  conference?: string;
  division?: string;
  league?: string;
};

export type NhlPlayer = {
  id: number;
  name: string;
  position: string;
  team: NhlTeam;
};

export type NhlSeasonStat = {
  playerId: number;
  stats: Record<string, unknown>;
};

export type NhlLivePlayerStat = {
  playerId: number;
  gameId: number;
  gameDate?: string;
  statusState: string;
  stats: Record<string, unknown>;
};

const WEB_BASE_URL = "https://api-web.nhle.com";
const STATS_BASE_URL = "https://api.nhle.com/stats/rest/en";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(url: string, attempt = 0): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    const retryAfter = Number(response.headers.get("retry-after") || 0);
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 500 * 2 ** attempt);
    await sleep(waitMs);
    return request<T>(url, attempt + 1);
  }

  if (!response.ok) throw new Error(`NHL API ${response.status} for ${url}`);
  return response.json() as Promise<T>;
}

function text(value: any) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.default ?? value.fr ?? "";
  return "";
}

function currentNhlSeasonStart(now = new Date()) {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 8 ? year : year - 1;
}

function seasonId(seasonStart: number) {
  return Number(`${seasonStart}${seasonStart + 1}`);
}

function normalizeStatus(state: unknown) {
  const value = String(state ?? "unknown").toUpperCase();
  if (value === "LIVE" || value === "CRIT") return "in_progress";
  if (value === "FINAL" || value === "OFF") return "final";
  return "scheduled";
}

export async function getNhlTeams(): Promise<NhlTeam[]> {
  const payload = await request<{ standings?: any[] }>(`${WEB_BASE_URL}/v1/standings/now`);
  const teams = new Map<string, NhlTeam>();

  for (const row of payload.standings ?? []) {
    const abbreviation = text(row.teamAbbrev) || row.teamAbbrev?.default || row.teamAbbrev;
    if (!abbreviation || teams.has(abbreviation)) continue;
    teams.set(abbreviation, {
      id: Number(row.teamId),
      name: text(row.teamName) || abbreviation,
      abbreviation,
      conference: row.conferenceName,
      division: row.divisionName,
      league: "NHL",
    });
  }

  return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getNhlActivePlayers(): Promise<NhlPlayer[]> {
  const teams = await getNhlTeams();
  const players = new Map<number, NhlPlayer>();

  for (let i = 0; i < teams.length; i += 8) {
    const batch = teams.slice(i, i + 8);
    const rosters = await Promise.all(batch.map(async (team) => {
      const roster = await request<any>(`${WEB_BASE_URL}/v1/roster/${team.abbreviation}/current`);
      return { team, roster };
    }));

    for (const { team, roster } of rosters) {
      const groups = [roster.forwards ?? [], roster.defensemen ?? [], roster.goalies ?? []];
      for (const row of groups.flat()) {
        const id = Number(row.id);
        if (!Number.isFinite(id)) continue;
        players.set(id, {
          id,
          name: `${text(row.firstName)} ${text(row.lastName)}`.trim() || `NHL Player ${id}`,
          position: row.positionCode || "—",
          team,
        });
      }
    }
  }

  return [...players.values()];
}

export async function getNhlSeasonStats(seasonStart: number): Promise<NhlSeasonStat[]> {
  const id = seasonId(seasonStart);
  const common = new URLSearchParams({
    isAggregate: "false",
    isGame: "false",
    start: "0",
    limit: "-1",
    cayenneExp: `seasonId=${id} and gameTypeId=2`,
  });

  const [skaters, goalies] = await Promise.all([
    request<{ data?: any[] }>(`${STATS_BASE_URL}/skater/summary?${common}`),
    request<{ data?: any[] }>(`${STATS_BASE_URL}/goalie/summary?${common}`),
  ]);

  const rows: NhlSeasonStat[] = [];
  for (const row of skaters.data ?? []) {
    const playerId = Number(row.playerId);
    if (!Number.isFinite(playerId)) continue;
    rows.push({
      playerId,
      stats: {
        player_type: "skater",
        games_played: row.gamesPlayed,
        goals: row.goals,
        assists: row.assists,
        points: row.points,
        points_per_game: row.pointsPerGame,
        plus_minus: row.plusMinus,
        penalty_minutes: row.penaltyMinutes,
        shots: row.shots,
        shooting_pct: row.shootingPct,
        time_on_ice_per_game: row.timeOnIcePerGame,
        faceoff_win_pct: row.faceoffWinPct,
      },
    });
  }

  for (const row of goalies.data ?? []) {
    const playerId = Number(row.playerId);
    if (!Number.isFinite(playerId)) continue;
    rows.push({
      playerId,
      stats: {
        player_type: "goalie",
        games_played: row.gamesPlayed,
        games_started: row.gamesStarted,
        wins: row.wins,
        losses: row.losses,
        overtime_losses: row.otLosses,
        save_pct: row.savePct,
        goals_against_average: row.goalsAgainstAverage,
        goals_against: row.goalsAgainst,
        saves: row.saves,
        shots_against: row.shotsAgainst,
        shutouts: row.shutouts,
        time_on_ice: row.timeOnIce,
      },
    });
  }

  return rows;
}

function flattenTeamStats(teamStats: any, game: any): NhlLivePlayerStat[] {
  const statusState = normalizeStatus(game.gameState);
  const base = {
    gameId: Number(game.id),
    gameDate: game.gameDate ? String(game.gameDate).slice(0, 10) : undefined,
    statusState,
  };

  const skaters = [...(teamStats?.forwards ?? []), ...(teamStats?.defense ?? [])];
  const skaterRows = skaters.flatMap((row: any) => {
    const playerId = Number(row.playerId);
    if (!Number.isFinite(playerId)) return [];
    return [{
      playerId,
      ...base,
      stats: {
        ...row,
        player_type: "skater",
        shots_on_goal: row.sog,
        penalty_minutes: row.pim,
        plus_minus: row.plusMinus,
        blocked_shots: row.blockedShots,
        time_on_ice: row.toi,
        status_state: statusState,
      } as Record<string, unknown>,
    }];
  });

  const goalieRows = (teamStats?.goalies ?? []).flatMap((row: any) => {
    const playerId = Number(row.playerId);
    if (!Number.isFinite(playerId)) return [];
    return [{
      playerId,
      ...base,
      stats: {
        ...row,
        player_type: "goalie",
        save_pct: row.savePctg,
        goals_against: row.goalsAgainst,
        shots_against: row.shotsAgainst,
        penalty_minutes: row.pim,
        time_on_ice: row.toi,
        status_state: statusState,
      } as Record<string, unknown>,
    }];
  });

  return [...skaterRows, ...goalieRows];
}

export async function getNhlLiveStats(dates: string[]): Promise<NhlLivePlayerStat[]> {
  const games = new Map<number, any>();

  for (const date of dates) {
    const payload = await request<{ games?: any[] }>(`${WEB_BASE_URL}/v1/score/${date}`);
    for (const game of payload.games ?? []) {
      const gameId = Number(game.id);
      const state = normalizeStatus(game.gameState);
      if (!Number.isFinite(gameId) || (game.gameType !== 2 && game.gameType !== 3)) continue;
      if (state !== "in_progress" && state !== "final") continue;
      games.set(gameId, game);
    }
  }

  const rows: NhlLivePlayerStat[] = [];
  const gameList = [...games.values()];
  for (let i = 0; i < gameList.length; i += 6) {
    const batch = gameList.slice(i, i + 6);
    const boxscores = await Promise.all(batch.map(async (game) => {
      const boxscore = await request<any>(`${WEB_BASE_URL}/v1/gamecenter/${game.id}/boxscore`);
      return { game: { ...game, gameState: boxscore.gameState ?? game.gameState, gameDate: boxscore.gameDate ?? game.gameDate }, boxscore };
    }));

    for (const { game, boxscore } of boxscores) {
      if (!boxscore.playerByGameStats) continue;
      rows.push(...flattenTeamStats(boxscore.playerByGameStats.homeTeam, game));
      rows.push(...flattenTeamStats(boxscore.playerByGameStats.awayTeam, game));
    }
  }

  return rows;
}

export { currentNhlSeasonStart };
