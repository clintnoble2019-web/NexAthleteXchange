import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatNexPoints } from "@/lib/nexpoints";

export default async function AthletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, athlete] = await Promise.all([
    getCurrentUser(),
    prisma.athlete.findUnique({ where: { slug }, include: { priceHistory: { orderBy: { createdAt: "desc" }, take: 12 } } })
  ]);
  if (!athlete || !athlete.marketEnabled) notFound();
  const current = Number(athlete.currentPrice);
  const previous = Number(athlete.previousPrice);
  const move = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const history = [...athlete.priceHistory].reverse();
  const maxHistoryPrice = history.length ? Math.max(...history.map((entry) => Number(entry.price))) : 1;

  return <main className="shell">
    <div className="hero"><div><p className="muted">{athlete.league} • {athlete.team} • {athlete.position}</p><h1>{athlete.name}</h1></div><div><span className="muted">Current price</span><h2>{formatNexPoints(current)}</h2><div className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</div></div></div>
    <section className="grid stats"><div className="card"><span className="muted">NexGame Performance</span><h2>{athlete.performance}/100</h2></div><div className="card"><span className="muted">Market status</span><h2>{athlete.active ? "Open" : "Closed"}</h2></div><div className="card"><span className="muted">Sport</span><h2>{athlete.sport}</h2></div></section>
    <br/>
    <section className="card"><h2>Price history</h2>{history.length ? <div className="history">{history.map((entry) => <div key={entry.id} className="historybar" style={{ height: `${Math.max(18, Number(entry.price) / maxHistoryPrice * 150)}px` }} title={formatNexPoints(Number(entry.price))}><span>{formatNexPoints(Number(entry.price), 0)}</span></div>)}</div> : <p className="muted">Price history begins as the NexGame pricing engine runs.</p>}</section>
    <br/>
    <section className="card"><h2>NexGame analysis</h2><p><strong>Performance:</strong> {athlete.performance >= 95 ? "Elite" : athlete.performance >= 90 ? "Strong" : "Watch"}</p><p className="muted">This first analysis layer is deterministic and performance-led. News, injuries, matchup context and richer AI analysis come in a later milestone.</p></section>
    <br/>
    <section className="card"><h2>Trade {athlete.name}</h2>{user ? <form className="tradeform" action="/api/trade" method="post"><input type="hidden" name="athleteId" value={athlete.id}/><input type="hidden" name="side" value="BUY"/><input type="hidden" name="returnTo" value={`/athletes/${athlete.slug}`}/><input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1"/><button>Buy</button></form> : <Link className="button" href="/login">Log in to trade</Link>}</section>
  </main>;
}
