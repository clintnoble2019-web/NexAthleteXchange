import Link from "next/link";
import { Sport } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatNexPoints } from "@/lib/nexpoints";
import AutoRefresh from "@/app/components/AutoRefresh";
import WatchlistButton from "@/app/components/WatchlistButton";

function sportFromParam(value?: string) {
  if (value === "MLB") return Sport.MLB;
  if (value === "NFL") return Sport.NFL;
  return Sport.NBA;
}

export default async function Discover({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const params = await searchParams;
  const sport = sportFromParam(params.sport);
  const sportName = String(sport);
  const user = await getCurrentUser();
  const [athletes, watchlist] = await Promise.all([
    prisma.athlete.findMany({ where: { sport, active: true, marketEnabled: true } }),
    user ? prisma.watchlistEntry.findMany({ where: { userId: user.id }, select: { athleteId: true } }) : Promise.resolve([]),
  ]);
  const watching = new Set(watchlist.map((entry) => entry.athleteId));
  const ranked = athletes.map((athlete) => {
    const current = Number(athlete.currentPrice);
    const previous = Number(athlete.previousPrice);
    return { athlete, current, move: previous > 0 ? ((current - previous) / previous) * 100 : 0 };
  });
  const risers = [...ranked].sort((a, b) => b.move - a.move).slice(0, 8);
  const fallers = [...ranked].sort((a, b) => a.move - b.move).slice(0, 8);
  const cheapPool = ranked.filter((item) => item.current <= 12);
  const breakouts = [...cheapPool]
    .sort((a, b) => b.move - a.move || Number(b.athlete.marketCap) - Number(a.athlete.marketCap))
    .slice(0, 8);
  const deepValue = [...cheapPool]
    .sort((a, b) => Number(b.athlete.marketCap) - Number(a.athlete.marketCap) || a.current - b.current)
    .slice(0, 8);
  const returnTo = `/discover?sport=${sportName}`;

  function rows(items: typeof ranked) {
    return items.map(({ athlete, current, move }) => <div className="scoutRow" key={athlete.id}>
      <div className="scoutMeta"><Link href={`/athletes/${athlete.slug}`}><strong>{athlete.name}</strong></Link><small className="muted">{athlete.team} • {athlete.position} • Cap {formatNexPoints(Number(athlete.marketCap))}</small></div>
      <div className="scoutPrice"><strong>{formatNexPoints(current)}</strong><div className={move >= 0 ? "positive smallText" : "negative smallText"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</div></div>
      {user && <div className="watchAction"><WatchlistButton athleteId={athlete.id} returnTo={returnTo} watching={watching.has(athlete.id)}/></div>}
    </div>);
  }

  return <main className="shell">
    <div className="hero"><div><p className="muted">SCOUT • NBA + NFL + MLB</p><h1>Find the breakout first</h1><p className="muted">Dig beyond the stars. Cheap players and depth pieces stay fully tradable.</p></div><AutoRefresh/></div>
    <div className="sportTabs">
      <Link className={sport === Sport.NBA ? "sportTab active" : "sportTab"} href="/discover?sport=NBA">NBA</Link>
      <Link className={sport === Sport.NFL ? "sportTab active" : "sportTab"} href="/discover?sport=NFL">NFL</Link>
      <Link className={sport === Sport.MLB ? "sportTab active" : "sportTab"} href="/discover?sport=MLB">MLB</Link>
    </div>

    <section className="scoutGrid">
      <div className="card scoutCard"><div><span className="eyebrow">MOMENTUM</span><h2>🔥 Biggest risers</h2><p className="muted">Players moving up on the latest market update.</p></div>{rows(risers)}</div>
      <div className="card scoutCard"><div><span className="eyebrow">PULLBACKS</span><h2>📉 Biggest fallers</h2><p className="muted">Potential buy-low spots or players losing momentum.</p></div>{rows(fallers)}</div>
      <div className="card scoutCard"><div><span className="eyebrow">UNDER N⟡12</span><h2>🎯 Breakout watch</h2><p className="muted">Low-priced athletes showing the strongest recent movement.</p></div>{rows(breakouts)}</div>
      <div className="card scoutCard"><div><span className="eyebrow">SCOUTING VALUE</span><h2>🌱 Deep value</h2><p className="muted">Low-priced athletes with the strongest Lifetime Performance Value.</p></div>{rows(deepValue)}</div>
    </section>
  </main>;
}
