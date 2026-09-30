import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatNexPoints } from "@/lib/nexpoints";
import ShareTradeForm from "@/app/components/ShareTradeForm";
import AutoRefresh from "@/app/components/AutoRefresh";
import WatchlistButton from "@/app/components/WatchlistButton";

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

  const [holding, watchlistEntry] = user ? await Promise.all([
    prisma.position.findUnique({ where: { userId_athleteId: { userId: user.id, athleteId: athlete.id } } }),
    prisma.watchlistEntry.findUnique({ where: { userId_athleteId: { userId: user.id, athleteId: athlete.id } } }),
  ]) : [null, null];
  const current = Number(athlete.currentPrice);
  const previous = Number(athlete.previousPrice);
  const move = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const history = [...athlete.priceHistory].reverse();
  const maxHistoryPrice = history.length ? Math.max(...history.map((entry) => Number(entry.price))) : 1;
  const trade = first(query.trade);
  const tradeError = first(query.tradeError);
  const owned = Number(holding?.quantity || 0);
  const marketCap = Number(athlete.marketCap);

  return <main className="shell">
    <div className="hero"><div><p className="muted">{athlete.league} • {athlete.team} • {athlete.position}</p><h1>{athlete.name}</h1>{user && <WatchlistButton athleteId={athlete.id} returnTo={`/athletes/${athlete.slug}`} watching={Boolean(watchlistEntry)}/>}</div><div className="heroActions"><AutoRefresh/><div><span className="muted">Current price</span><h2>{formatNexPoints(current)}</h2><div className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</div></div></div></div>

    {trade && <div className="notice successNotice">{trade === "SELL" ? "Sale completed." : "Purchase completed."} {owned > 0 ? `You now own ${owned.toFixed(4)} shares.` : "Your position is now closed."}</div>}
    {tradeError && <div className="notice errorNotice">{tradeError}</div>}

    <section className="grid fourStats"><div className="card"><span className="muted">Market Cap</span><h2>{formatNexPoints(marketCap)}</h2><small className="muted">Lifetime Performance Value</small></div><div className="card"><span className="muted">Market status</span><h2>{athlete.active ? "Open" : "Closed"}</h2></div><div className="card"><span className="muted">Sport</span><h2>{athlete.sport}</h2></div><div className="card"><span className="muted">You own</span><h2>{owned.toFixed(4)}</h2><small className="muted">shares</small></div></section>
    <br/>
    <section className="card"><h2>Price history</h2>{history.length ? <div className="history">{history.map((entry) => <div key={entry.id} className="historybar" style={{ height: `${Math.max(18, Number(entry.price) / maxHistoryPrice * 150)}px` }} title={formatNexPoints(Number(entry.price))}><span>{formatNexPoints(Number(entry.price), 0)}</span></div>)}</div> : <p className="muted">Price history begins as the NexGame pricing engine runs.</p>}<p className="muted smallText">Buying or selling shares executes at the current market price. The chart changes only when the NexGame market engine actually reprices the athlete.</p></section>
    <br/>
    <section className="card"><h2>Market Cap</h2><p><strong>{formatNexPoints(marketCap)}</strong> in Lifetime Performance Value.</p><p className="muted">Market Cap is driven only by tracked real-world performance over the lifetime of NexAthleteXchange. User buying, selling, share ownership, and trading volume do not increase it.</p></section>
    <br/>
    <section className="card"><div className="sectionHeading"><div><span className="eyebrow">TRADE SHARES</span><h2>{athlete.name}</h2></div>{user && <span className="muted">Balance {formatNexPoints(Number(user.wallet?.balance || 0))}</span>}</div>{user ? <div className="tradePanels"><div><h3>Buy shares</h3><ShareTradeForm athleteId={athlete.id} athleteName={athlete.name} side="BUY" price={current} returnTo={`/athletes/${athlete.slug}`}/></div><div><h3>Sell shares</h3>{holding ? <ShareTradeForm athleteId={athlete.id} athleteName={athlete.name} side="SELL" price={current} returnTo={`/athletes/${athlete.slug}`} maxShares={owned}/> : <p className="muted">Buy shares first to open a position.</p>}</div></div> : <Link className="button" href="/login">Log in to trade</Link>}</section>
  </main>;
}
