import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Discover() {
  const athletes = await prisma.athlete.findMany({ where: { sport: "MLB", active: true } });
  const ranked = athletes.map((athlete) => {
    const current = Number(athlete.currentPrice);
    const previous = Number(athlete.previousPrice);
    return { athlete, move: previous > 0 ? ((current - previous) / previous) * 100 : 0 };
  });
  const movers = [...ranked].sort((a, b) => b.move - a.move).slice(0, 5);
  const value = [...ranked].sort((a, b) => (b.athlete.performance / Number(b.athlete.currentPrice)) - (a.athlete.performance / Number(a.athlete.currentPrice))).slice(0, 5);

  return <main className="shell">
    <div className="hero"><div><p className="muted">DISCOVER</p><h1>Find your next athlete</h1></div></div>
    <section className="grid two">
      <div className="card"><h2>🔥 Trending</h2>{movers.map(({ athlete, move }) => <Link className="discoverRow" key={athlete.id} href={`/athletes/${athlete.slug}`}><span><strong>{athlete.name}</strong><small>{athlete.team}</small></span><span className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</span></Link>)}</div>
      <div className="card"><h2>💎 Value watch</h2>{value.map(({ athlete }) => <Link className="discoverRow" key={athlete.id} href={`/athletes/${athlete.slug}`}><span><strong>{athlete.name}</strong><small>{athlete.team}</small></span><span>${Number(athlete.currentPrice).toFixed(2)} • {athlete.performance}</span></Link>)}</div>
    </section>
  </main>;
}
