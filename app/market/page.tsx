import Link from "next/link";
import { Prisma, Sport } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatNexPoints, NEXPOINTS_SYMBOL } from "@/lib/nexpoints";
import ShareTradeForm from "@/app/components/ShareTradeForm";
import AutoRefresh from "@/app/components/AutoRefresh";

type Param = string | string[] | undefined;
type MarketSearchParams = {
  sport?: Param;
  team?: Param;
  q?: Param;
  position?: Param;
  sort?: Param;
  page?: Param;
  perPage?: Param;
  trade?: Param;
  tradeError?: Param;
};

type SortKey = "market_cap" | "price_desc" | "price_asc" | "name";

const SORTS: Record<SortKey, string> = {
  market_cap: "Highest Market Cap",
  price_desc: "Highest Price",
  price_asc: "Lowest Price",
  name: "A–Z",
};

function first(value: Param) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sportFromParam(value: string | undefined) {
  if (value === "MLB") return Sport.MLB;
  if (value === "NFL") return Sport.NFL;
  return Sport.NBA;
}

export default async function Market({ searchParams }: { searchParams: Promise<MarketSearchParams> }) {
  const params = await searchParams;
  const sport = sportFromParam(first(params.sport));
  const sportName = String(sport);
  const team = first(params.team)?.trim().toUpperCase() || "";
  const q = first(params.q)?.trim().slice(0, 80) || "";
  const position = first(params.position)?.trim().slice(0, 20) || "";
  const requestedSort = first(params.sort) as SortKey | undefined;
  const sort: SortKey = requestedSort && requestedSort in SORTS ? requestedSort : "market_cap";
  const requestedPerPage = positiveInt(first(params.perPage), 25);
  const perPage = [25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 25;
  const requestedPage = positiveInt(first(params.page), 1);
  const trade = first(params.trade);
  const tradeError = first(params.tradeError);

  const where: Prisma.AthleteWhereInput = {
    sport,
    active: true,
    marketEnabled: true,
    ...(team ? { team } : {}),
    ...(position ? { position } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { team: { contains: q, mode: "insensitive" } },
        { position: { contains: q, mode: "insensitive" } },
      ]
    } : {}),
  };

  const [user, teams, positionRows, totalPlayers] = await Promise.all([
    getCurrentUser(),
    prisma.team.findMany({ where: { sport, active: true }, orderBy: { name: "asc" } }),
    prisma.athlete.findMany({
      where: { sport, active: true, marketEnabled: true },
      select: { position: true },
      distinct: ["position"],
      orderBy: { position: "asc" },
    }),
    prisma.athlete.count({ where }),
  ]);

  const positions = positionRows.map((row) => row.position).filter(Boolean);
  const totalPages = Math.max(1, Math.ceil(totalPlayers / perPage));
  const page = Math.min(requestedPage, totalPages);

  const orderBy: Prisma.AthleteOrderByWithRelationInput[] =
    sort === "price_desc" ? [{ currentPrice: "desc" }, { name: "asc" }] :
    sort === "price_asc" ? [{ currentPrice: "asc" }, { name: "asc" }] :
    sort === "name" ? [{ name: "asc" }] :
    [{ marketCap: "desc" }, { currentPrice: "desc" }, { name: "asc" }];

  const athletes = await prisma.athlete.findMany({
    where,
    orderBy,
    skip: (page - 1) * perPage,
    take: perPage,
  });

  function marketHref(overrides: Record<string, string | number | null | undefined> = {}) {
    const state: Record<string, string | number> = {
      sport: sportName,
      team,
      q,
      position,
      sort,
      perPage,
      page,
      ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== null && value !== undefined)) as Record<string, string | number>,
    };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(state)) {
      if (value === "" || (key === "page" && Number(value) === 1)) continue;
      query.set(key, String(value));
    }
    return `/market?${query.toString()}`;
  }

  const firstResult = totalPlayers === 0 ? 0 : (page - 1) * perPage + 1;
  const lastResult = Math.min(page * perPage, totalPlayers);
  const returnTo = marketHref();

  return <main className="shell">
    <div className="hero">
      <div>
        <p className="muted">FREE MARKET • NBA + NFL + MLB</p>
        <h1>{sportName} Athlete Market</h1>
        <p className="muted">Trade athlete shares with NexPoints. Fractional shares start at 0.01.</p>
      </div>
      <div className="heroActions"><AutoRefresh/>{user ? <div><span className="muted">NexPoints balance</span><h2>{formatNexPoints(Number(user.wallet?.balance || 0))}</h2></div> : <Link className="button" href="/signup">Start with {NEXPOINTS_SYMBOL}5,000</Link>}</div>
    </div>

    {trade && <div className="notice successNotice">{trade === "SELL" ? "Sale completed." : "Purchase completed."} Your NexPoints balance and portfolio have been updated.</div>}
    {tradeError && <div className="notice errorNotice">{tradeError}</div>}

    <div className="sportTabs" aria-label="Launch sports">
      <Link className={sport === Sport.NBA ? "sportTab active" : "sportTab"} href={marketHref({ sport: "NBA", team: "", position: "", page: 1 })}>NBA</Link>
      <Link className={sport === Sport.NFL ? "sportTab active" : "sportTab"} href={marketHref({ sport: "NFL", team: "", position: "", page: 1 })}>NFL</Link>
      <Link className={sport === Sport.MLB ? "sportTab active" : "sportTab"} href={marketHref({ sport: "MLB", team: "", position: "", page: 1 })}>MLB</Link>
    </div>

    <section className="teamsBlock">
      <div className="sectionHeading"><div><span className="eyebrow">TEAMS</span><h2>Browse by team</h2></div><span className="muted">Current {sportName} rosters</span></div>
      <div className="teamStrip">
        <Link className={!team ? "teamChip selected" : "teamChip"} href={marketHref({ team: "", page: 1 })}><span className="teamMark">ALL</span><strong>All Teams</strong></Link>
        {teams.map((item) => <Link className={team === item.abbreviation ? "teamChip selected" : "teamChip"} key={item.id} href={marketHref({ team: item.abbreviation, page: 1 })}><span className="teamMark">{item.abbreviation}</span><strong>{item.name}</strong></Link>)}
      </div>
    </section>

    <section className="marketControls card">
      <form className="marketFilterForm" method="get" action="/market">
        <input type="hidden" name="sport" value={sportName}/>
        {team && <input type="hidden" name="team" value={team}/>} 
        <label className="filterField searchField"><span>Search</span><input name="q" defaultValue={q} placeholder="Player, team, or position"/></label>
        <label className="filterField"><span>Position</span><select name="position" defaultValue={position}><option value="">All positions</option>{positions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="filterField"><span>Sort</span><select name="sort" defaultValue={sort}>{Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="filterField"><span>Rows</span><select name="perPage" defaultValue={String(perPage)}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
        <div className="filterActions"><button type="submit">Apply filters</button><Link className="button secondary" href={`/market?sport=${sportName}`}>Reset</Link></div>
      </form>
    </section>

    <div className="marketMeta">
      <div><strong>{totalPlayers.toLocaleString()} players</strong><span className="muted">Showing {firstResult.toLocaleString()}–{lastResult.toLocaleString()}</span></div>
      <span className="muted">Sorted by {SORTS[sort]}</span>
    </div>

    <section className="card marketCard">
      <table className="market">
        <thead><tr><th>Player</th><th>Team</th><th>Price / share</th><th>Move</th><th className="hide-mobile">Market Cap</th><th>Trade</th></tr></thead>
        <tbody>{athletes.map((athlete) => {
          const current = Number(athlete.currentPrice);
          const previous = Number(athlete.previousPrice);
          const move = previous > 0 ? ((current - previous) / previous) * 100 : 0;
          return <tr key={athlete.id}>
            <td><Link href={`/athletes/${athlete.slug}`}><strong>{athlete.name}</strong></Link><div className="muted">{athlete.position}</div></td>
            <td>{athlete.team}</td>
            <td className="price">{formatNexPoints(current)}</td>
            <td className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</td>
            <td className="hide-mobile">{formatNexPoints(Number(athlete.marketCap))}</td>
            <td>{user ? <ShareTradeForm athleteId={athlete.id} athleteName={athlete.name} side="BUY" price={current} returnTo={returnTo} compact/> : <Link className="button" href="/login">Log in</Link>}</td>
          </tr>;
        })}</tbody>
      </table>
      {athletes.length === 0 && <div className="emptyState"><h3>No players match these filters.</h3><p className="muted">Try clearing search, team, or position filters.</p><Link className="button secondary" href={`/market?sport=${sportName}`}>Reset market</Link></div>}
    </section>

    {totalPlayers > 0 && <nav className="pagination" aria-label="Market pages">
      {page > 1 ? <Link className="pageButton" href={marketHref({ page: page - 1 })}>← Previous</Link> : <span className="pageButton disabled">← Previous</span>}
      <span className="pageStatus">Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
      {page < totalPages ? <Link className="pageButton" href={marketHref({ page: page + 1 })}>Next →</Link> : <span className="pageButton disabled">Next →</span>}
    </nav>}
  </main>;
}
