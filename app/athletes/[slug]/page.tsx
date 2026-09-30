import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatNexPoints } from "@/lib/nexpoints";

type Param = string | string[] | undefined;
function first(value: Param) { return Array.isArray(value) ? value[0] : value; }

export default async function AthletePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ trade?: Param; tradeError?: Param }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const [user, athlete] = await Promise.all([
    getCurrentUser(),
    prisma.athlete.findUnique({ where: { slug }, include: { priceHistory: { orderBy: { createdAt: "desc" }, take: 12 } } })
  ]);
  if (!athlete || !athlete.marketEnabled) notFound();

  const holding = user ? await prisma.position.findUnique({ where: { userId_athleteId: { userId: user.id, athleteId: athlete.id } } }) : null;
  const current = Number(athlete.currentPrice);
  const previous = Number(athlete.previousPrice);
  const move = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const history = [...athlete.priceHistory].reverse();
  const maxHistoryPrice = history.length ? Math.max(...history.map((entry) => Number(entry.price))) : 1;
  const trade = first(query.trade);
  const tradeError = first(query.tradeError);
  const owned = Number(holding?.quantity || 0);

  return <main className="shell">
    <div className="hero"><div><p className="muted">{athlete.league} • {athlete.team} • {athlete.position}</p><h1>{athlete.name}</h1></div><div><span className="muted">Current price</span><h2>{formatNexPoints(current)}</h2><div className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</div></div></div>

    {trade && <div className="notice successNotice">{trade === "SELL" ? "Sale completed." : "Purchase completed."} {owned > 0 ? `You now own ${owned.toFixed(4)} units.` : "Your position is now closed."}</div>}
    {tradeError && <div className="notice errorNotice">{tradeError}</div>}

    <section className="grid fourStats"><div className="card"><span className="muted">NexGame Performance</span><h2>{athlete.performance}/100</h2></div><div className="card"><span className="muted">Market status</span><h2>{athlete.active ? "Open" : "Closed"}</h2></div><div className="card"><span className="muted">Sport</span><h2>{athlete.sport}</h2></div><div className="card"><span className="muted">You own</span><h2>{owned.toFixed(4)}</h2><small className="muted">athlete units</small></div></section>
    <br/>
    <section className="card"><h2>Price history</h2>{history.length ? <div className="history">{history.map((entry) => <div key={entry.id} className="historybar" style={{ height: `${Math.max(18, Number(entry.price) / maxHistoryPrice * 150)}px` }} title={formatNexPoints(Number(entry.price))}><span>{formatNexPoints(Number(entry.price), 0)}</span></div>)}</div> : <p className="muted">Price history begins as the NexGame pricing engine runs.</p>}</section>
    <br/>
    <section className="card"><h2>NexGame analysis</h2><p><strong>Performance:</strong> {athlete.performance >= 95 ? "Elite" : athlete.performance >= 90 ? "Strong" : athlete.performance >= 70 ? "Productive" : "Watch"}</p><p className="muted">Performance and price history are driven by the NexGame market engine. Live BALLDONTLIE updates move prices toward current performance value while limiting each repricing move.</p></section>
    <br/>
    <section className="card"><div className="sectionHeading"><div><span className="eyebrow">TRADE</span><h2>{athlete.name}</h2></div>{user && <span className="muted">Balance {formatNexPoints(Number(user.wallet?.balance || 0))}</span>}</div>{user ? <div className="tradePanels"><div><h3>Buy</h3><form className="tradeform" action="/api/trade" method="post"><input type="hidden" name="athleteId" value={athlete.id}/><input type="hidden" name="side" value="BUY"/><input type="hidden" name="returnTo" value={`/athletes/${athlete.slug}`}/><input aria-label={`Buy ${athlete.name} units`} name="quantity" type="number" min="0.01" step="0.01" defaultValue="1"/><button>Buy</button></form></div><div><h3>Sell</h3>{holding ? <form className="tradeform" action="/api/trade" method="post"><input type="hidden" name="athleteId" value={athlete.id}/><input type="hidden" name="side" value="SELL"/><input type="hidden" name="returnTo" value={`/athletes/${athlete.slug}`}/><input aria-label={`Sell ${athlete.name} units`} name="quantity" type="number" min="0.01" step="0.01" max={owned} defaultValue={owned}/><button className="secondary">Sell</button></form> : <p className="muted">Buy units first to open a position.</p>}</div></div> : <Link className="button" href="/login">Log in to trade</Link>}</section>
  </main>;
}
