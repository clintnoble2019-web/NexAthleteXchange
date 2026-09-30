import Link from "next/link";
import { Sport } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatNexPoints } from "@/lib/nexpoints";

export default async function Discover({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const params = await searchParams;
  const sport = params.sport === "MLB" ? Sport.MLB : Sport.NBA;
  const sportName = sport === Sport.NBA ? "NBA" : "MLB";
  const athletes = await prisma.athlete.findMany({ where: { sport, active: true, marketEnabled: true } });
  const ranked = athletes.map((athlete) => {
    const current = Number(athlete.currentPrice);
    const previous = Number(athlete.previousPrice);
    return { athlete, move: previous > 0 ? ((current - previous) / previous) * 100 : 0 };
  });
  const movers = [...ranked].sort((a, b) => b.move - a.move).slice(0, 5);
  const value = [...ranked].sort((a, b) => (b.athlete.performance / Number(b.athlete.currentPrice)) - (a.athlete.performance / Number(a.athlete.currentPrice))).slice(0, 5);

  return <main className="shell">
    <div className="hero"><div><p className="muted">DISCOVER • NBA + MLB</p><h1>Find your next athlete</h1></div></div>
    <div className="sportTabs"><Link className={sport === Sport.NBA ? "sportTab active" : "sportTab"} href="/discover?sport=NBA">NBA</Link><Link className={sport === Sport.MLB ? "sportTab active" : "sportTab"} href="/discover?sport=MLB">MLB</Link></div>
    <section className="grid two">
      <div className="card"><h2>🔥 {sportName} Trending</h2>{movers.map(({ athlete, move }) => <Link className="discoverRow" key={athlete.id} href={`/athletes/${athlete.slug}`}><span><strong>{athlete.name}</strong><small>{athlete.team}</small></span><span className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</span></Link>)}</div>
      <div className="card"><h2>💎 Value watch</h2>{value.map(({ athlete }) => <Link className="discoverRow" key={athlete.id} href={`/athletes/${athlete.slug}`}><span><strong>{athlete.name}</strong><small>{athlete.team}</small></span><span>{formatNexPoints(Number(athlete.currentPrice))} • {athlete.performance}</span></Link>)}</div>
    </section>
  </main>;
}
