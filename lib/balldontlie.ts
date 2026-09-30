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

type Page<T> = { data: T[]; meta?: { next_cursor?: number | string | null } };

const BASE_URL = "https://api.balldontlie.io";

function apiKey() {
  const key = process.env.BALLDONTLIE_API_KEY;
  if (!key) throw new Error("BALLDONTLIE_API_KEY is not configured");
  return key;
}

async function request<T>(path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: apiKey() },
    cache: "no-store"
  });
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

export async function getBdlTeams(sport: BdlSport): Promise<BdlTeam[]> {
  const payload = await request<{ data: any[] }>(teamPath(sport));
  return payload.data.map((team) => normalizeTeam(sport, team));
}

export async function getBdlActivePlayers(sport: BdlSport): Promise<BdlPlayer[]> {
  const players: BdlPlayer[] = [];
  let cursor: number | string | null | undefined;
  do {
    const query = new URLSearchParams({ per_page: "100" });
    if (cursor != null) query.set("cursor", String(cursor));
    const page = await request<Page<any>>(`${playersPath(sport)}?${query}`);
    players.push(...page.data.map((player) => normalizePlayer(sport, player)));
    cursor = page.meta?.next_cursor;
  } while (cursor != null);
  return players;
}
