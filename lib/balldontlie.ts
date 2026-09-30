export type BdlSport = "NBA" | "MLB";

export type BdlTeam = {
  id: number;
  name: string;
  abbreviation: string;
  city?: string;
  conference?: string;
  division?: string;
  league?: string;
};

export type BdlPlayer = {
  id: number;
  name: string;
  position: string;
  team: BdlTeam;
};

export type BdlNbaSeasonAverage = {
  playerId: number;
  stats: Record<string, unknown>;
};

export type BdlMlbSeasonStat = {
  playerId: number;
  stats: Record<string, unknown>;
};

export type BdlLivePlayerStat = {
  playerId: number;
  gameId: number;
  gameDate?: string;
  statusState: string;
  stats: Record<string, unknown>;
};

type Page<T> = { data: T[]; meta?: { next_cursor?: number | string | null } };

const BASE_URL = "https://api.balldontlie.io";

function apiKey() {
  const key = process.env.BALLDONTLIE_API_KEY;
  if (!key) throw new Error("BALLDONTLIE_API_KEY is not configured");
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, attempt = 0): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: apiKey() },
    cache: "no-store"
  });

  if (response.status === 429 && attempt < 5) {
    const retryAfter = Number(response.headers.get("retry-after") || 0);
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(16000, 1000 * 2 ** attempt);
    await sleep(waitMs);
    return request<T>(path, attempt + 1);
  }

  if (!response.ok) throw new Error(`BALLDONTLIE ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

function teamPath(sport: BdlSport) {
  return sport === "NBA" ? "/v1/teams" : "/mlb/v1/teams";
}

function playersPath(sport: BdlSport) {
  return sport === "NBA" ? "/v1/players/active" : "/mlb/v1/players/active";
}

function normalizeTeam(sport: BdlSport, raw: any): BdlTeam {
  if (sport === "NBA") {
    return {
      id: raw.id,
      name: raw.full_name ?? `${raw.city ?? ""} ${raw.name ?? ""}`.trim(),
      abbreviation: raw.abbreviation,
      city: raw.city,
      conference: raw.conference,
      division: raw.division,
      league: "NBA"
    };
  }
  return {
    id: raw.id,
    name: raw.display_name ?? raw.name,
    abbreviation: raw.abbreviation,
    city: raw.location,
    division: raw.division,
    league: raw.league ?? "MLB"
  };
}

function normalizePlayer(sport: BdlSport, raw: any): BdlPlayer {
  return {
    id: raw.id,
    name: sport === "NBA" ? `${raw.first_name} ${raw.last_name}`.trim() : (raw.full_name ?? `${raw.first_name} ${raw.last_name}`.trim()),
    position: raw.position || "—",
    team: normalizeTeam(sport, raw.team)
  };
}

async function collectPages<T>(pathForCursor: (cursor?: string | number | null) => string): Promise<T[]> {
  const rows: T[] = [];
  let cursor: number | string | null | undefined;
  do {
    const page = await request<Page<T>>(pathForCursor(cursor));
    rows.push(...page.data);
    cursor = page.meta?.next_cursor;
  } while (cursor != null);
  return rows;
}

export async function getBdlTeams(sport: BdlSport): Promise<BdlTeam[]> {
  const payload = await request<{ data: any[] }>(teamPath(sport));
  return payload.data.map((team) => normalizeTeam(sport, team));
}

export async function getBdlActivePlayers(sport: BdlSport): Promise<BdlPlayer[]> {
  const rawPlayers = await collectPages<any>((cursor) => {
    const query = new URLSearchParams({ per_page: "100" });
    if (cursor != null) query.set("cursor", String(cursor));
    return `${playersPath(sport)}?${query}`;
  });
  return rawPlayers.map((player) => normalizePlayer(sport, player));
}

export async function getBdlNbaSeasonAverages(season: number): Promise<BdlNbaSeasonAverage[]> {
  const buildPath = (base: string, cursor?: string | number | null) => {
    const query = new URLSearchParams({
      season: String(season),
      season_type: "regular",
      type: "base",
      per_page: "100"
    });
    if (cursor != null) query.set("cursor", String(cursor));
    return `${base}?${query}`;
  };

  const collect = async (base: string) => collectPages<any>((cursor) => buildPath(base, cursor));
  let rows: any[];
  try {
    rows = await collect("/nba/v1/season_averages/general");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("404")) throw error;
    rows = await collect("/v1/season_averages/general");
  }

  return rows.flatMap((row) => {
    const playerId = Number(row.player?.id ?? row.player_id);
    if (!Number.isFinite(playerId)) return [];
    return [{ playerId, stats: (row.stats ?? row) as Record<string, unknown> }];
  });
}

export async function getBdlMlbSeasonStats(season: number): Promise<BdlMlbSeasonStat[]> {
  const rows = await collectPages<any>((cursor) => {
    const query = new URLSearchParams({ season: String(season), season_type: "regular", per_page: "100" });
    if (cursor != null) query.set("cursor", String(cursor));
    return `/mlb/v1/season_stats?${query}`;
  });

  return rows.flatMap((row) => {
    const playerId = Number(row.player?.id ?? row.player_id);
    if (!Number.isFinite(playerId)) return [];
    return [{ playerId, stats: row as Record<string, unknown> }];
  });
}

export async function getBdlNbaLiveStats(dates: string[]): Promise<BdlLivePlayerStat[]> {
  const rows = await collectPages<any>((cursor) => {
    const query = new URLSearchParams({ per_page: "100", season_type: "regular" });
    for (const date of dates) query.append("dates[]", date);
    if (cursor != null) query.set("cursor", String(cursor));
    return `/v1/stats?${query}`;
  });

  return rows.flatMap((row) => {
    const playerId = Number(row.player?.id ?? row.player_id);
    const gameId = Number(row.game?.id ?? row.game_id);
    if (!Number.isFinite(playerId) || !Number.isFinite(gameId)) return [];
    const statusState = String(row.game?.status_state ?? row.status_state ?? "unknown").toLowerCase();
    return [{
      playerId,
      gameId,
      gameDate: row.game?.date ? String(row.game.date).slice(0, 10) : undefined,
      statusState,
      stats: {
        ...row,
        tov: row.tov ?? row.turnover ?? row.turnovers,
      } as Record<string, unknown>,
    }];
  });
}

export async function getBdlMlbLiveStats(dates: string[]): Promise<BdlLivePlayerStat[]> {
  const games = await collectPages<any>((cursor) => {
    const query = new URLSearchParams({ per_page: "100", season_type: "regular" });
    for (const date of dates) query.append("dates[]", date);
    if (cursor != null) query.set("cursor", String(cursor));
    return `/mlb/v1/games?${query}`;
  });

  const eligibleGames = games.filter((game) => {
    const state = String(game.status_state ?? "unknown").toLowerCase();
    return state === "in_progress" || state === "final";
  });
  const gameMeta = new Map<number, { statusState: string; gameDate?: string }>(eligibleGames.map((game) => [
    Number(game.id),
    {
      statusState: String(game.status_state ?? "unknown").toLowerCase(),
      gameDate: game.date ? String(game.date).slice(0, 10) : undefined,
    }
  ]));
  const gameIds = eligibleGames.map((game) => Number(game.id)).filter(Number.isFinite);
  if (gameIds.length === 0) return [];

  const rows: any[] = [];
  for (let i = 0; i < gameIds.length; i += 20) {
    const batch = gameIds.slice(i, i + 20);
    const batchRows = await collectPages<any>((cursor) => {
      const query = new URLSearchParams({ per_page: "100" });
      for (const gameId of batch) query.append("game_ids[]", String(gameId));
      if (cursor != null) query.set("cursor", String(cursor));
      return `/mlb/v1/stats?${query}`;
    });
    rows.push(...batchRows);
  }

  return rows.flatMap((row) => {
    const playerId = Number(row.player?.id ?? row.player_id);
    const gameId = Number(row.game?.id ?? row.game_id);
    if (!Number.isFinite(playerId) || !Number.isFinite(gameId)) return [];
    const meta = gameMeta.get(gameId);
    return [{
      playerId,
      gameId,
      gameDate: meta?.gameDate ?? (row.game?.date ? String(row.game.date).slice(0, 10) : undefined),
      statusState: meta?.statusState ?? String(row.game?.status_state ?? row.status_state ?? "unknown").toLowerCase(),
      stats: row as Record<string, unknown>,
    }];
  });
}
