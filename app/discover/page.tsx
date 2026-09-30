import Link from "next/link";
import { Sport } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatNexPoints } from "@/lib/nexpoints";

function sportFromParam(value?: string) {
  if (value === "MLB") return Sport.MLB;
  if (value === "NFL") return Sport.NFL;
  return Sport.NBA;
}

export default async function Discover({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const params = await searchParams;
  const sport = sportFromParam(params.sport);
  const sportName = String(sport);
  const athletes = await prisma.athlete.findMany({ where: { sport, active: true, marketEnabled: true } });
  const ranked = athletes.map((athlete) => {
    const current = Number(athlete.currentPrice);
    const previous = Number(athlete.previousPrice);
    return { athlete, move: previous > 0 ? ((current - previous) / previous) * 100 : 0 };
  });
  const movers = [...ranked].sort((a, b) => b.move - a.move).slice(0, 5);
  const marketCapLeaders = [...ranked]
    .sort((a, b) => Number(b.athlete.marketCap) - Number(a.athlete.marketCap))
    .slice(0, 5);

  return <main className="shell">
    <div className="hero"><div><p className="muted">DISCOVER • NBA + NFL + MLB</p><h1>Find your next athlete</h1></div></div>
    <div className="sportTabs">
      <Link className={sport === Sport.NBA ? "sportTab active" : "sportTab"} href="/discover?sport=NBA">NBA</Link>
      <Link className={sport === Sport.NFL ? "sportTab active" : "sportTab"} href="/discover?sport=NFL">NFL</Link>
      <Link className={sport === Sport.MLB ? "sportTab active" : "sportTab"} href="/discover?sport=MLB">MLB</Link>
    </div>
    <section className="grid two">
      <div className="card"><h2>🔥 {sportName} Trending</h2>{movers.map(({ athlete, move }) => <Link className="discoverRow" key={athlete.id} href={`/athletes/${athlete.slug}`}><span><strong>{athlete.name}</strong><small>{athlete.team}</small></span><span className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</span></Link>)}</div>
      <div className="card"><h2>🏆 Market Cap leaders</h2>{marketCapLeaders.map(({ athlete }) => <Link className="discoverRow" key={athlete.id} href={`/athletes/${athlete.slug}`}><span><strong>{athlete.name}</strong><small>{athlete.team}</small></span><span>{formatNexPoints(Number(athlete.marketCap))}</span></Link>)}</div>
    </section>
  </main>;
}
