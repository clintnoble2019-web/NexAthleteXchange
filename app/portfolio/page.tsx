import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeSide } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNexPoints, formatSignedNexPoints } from "@/lib/nexpoints";
import ShareTradeForm from "@/app/components/ShareTradeForm";

type Param = string | string[] | undefined;
function first(value: Param) { return Array.isArray(value) ? value[0] : value; }

export default async function Portfolio({ searchParams }: { searchParams: Promise<{ trade?: Param; tradeError?: Param }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;

  const [positions, recentTrades, realized] = await Promise.all([
    prisma.position.findMany({
      where: { userId: user.id },
      include: { athlete: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.trade.findMany({
      where: { userId: user.id },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.trade.aggregate({
      where: { userId: user.id, side: TradeSide.SELL },
      _sum: { realizedPnl: true },
    }),
  ]);

  const holdings = positions.reduce((sum, p) => sum + Number(p.quantity) * Number(p.athlete.currentPrice), 0);
  const cost = positions.reduce((sum, p) => sum + Number(p.quantity) * Number(p.averageCost), 0);
  const cash = Number(user.wallet?.balance || 0);
  const unrealizedPnl = holdings - cost;
  const realizedPnl = Number(realized._sum.realizedPnl || 0);
  const totalPnl = realizedPnl + unrealizedPnl;
  const trade = first(params.trade);
  const tradeError = first(params.tradeError);

  return <main className="shell">
    <div className="hero"><div><p className="muted">MY PORTFOLIO</p><h1>{user.username}</h1></div><div><span className="muted">Available NexPoints</span><h2>{formatNexPoints(cash)}</h2></div></div>

    {trade && <div className="notice successNotice">{trade === "SELL" ? "Sale completed." : "Purchase completed."} Your portfolio is up to date.</div>}
    {tradeError && <div className="notice errorNotice">{tradeError}</div>}

    <section className="grid fourStats">
      <div className="card"><span className="muted">Portfolio value</span><h2>{formatNexPoints(cash + holdings)}</h2><small className="muted">Cash + holdings</small></div>
      <div className="card"><span className="muted">Holdings value</span><h2>{formatNexPoints(holdings)}</h2><small className="muted">Cost basis {formatNexPoints(cost)}</small></div>
      <div className="card"><span className="muted">Unrealized P/L</span><h2 className={unrealizedPnl >= 0 ? "positive" : "negative"}>{formatSignedNexPoints(unrealizedPnl)}</h2><small className="muted">Open positions</small></div>
      <div className="card"><span className="muted">Total P/L</span><h2 className={totalPnl >= 0 ? "positive" : "negative"}>{formatSignedNexPoints(totalPnl)}</h2><small className="muted">Realized {formatSignedNexPoints(realizedPnl)}</small></div>
    </section>

    <br/>
    <section className="card">
      <div className="sectionHeading"><div><span className="eyebrow">HOLDINGS</span><h2>Open positions</h2></div><Link className="button secondary" href="/market">Browse market</Link></div>
      <table className="market">
        <thead><tr><th>Player</th><th>Shares</th><th>Avg cost</th><th>Current</th><th>Value</th><th>P/L</th><th>Trade</th></tr></thead>
        <tbody>{positions.map((p) => {
          const quantity = Number(p.quantity);
          const current = Number(p.athlete.currentPrice);
          const value = quantity * current;
          const basis = quantity * Number(p.averageCost);
          const rowPnl = value - basis;
          const rowPct = basis > 0 ? rowPnl / basis * 100 : 0;
          return <tr key={p.id}>
            <td><Link href={`/athletes/${p.athlete.slug}`}><strong>{p.athlete.name}</strong></Link><div className="muted">{p.athlete.sport} • {p.athlete.team}</div></td>
            <td>{quantity.toFixed(4)}</td>
            <td>{formatNexPoints(Number(p.averageCost))}</td>
            <td>{formatNexPoints(current)}</td>
            <td>{formatNexPoints(value)}</td>
            <td className={rowPnl >= 0 ? "positive" : "negative"}>{formatSignedNexPoints(rowPnl)}<div className="smallText">{rowPct >= 0 ? "+" : ""}{rowPct.toFixed(2)}%</div></td>
            <td><ShareTradeForm athleteId={p.athleteId} athleteName={p.athlete.name} side="SELL" price={current} returnTo="/portfolio" maxShares={quantity} compact/></td>
          </tr>;
        })}{positions.length === 0 && <tr><td colSpan={7} className="muted">No holdings yet. Buy your first athlete shares from the market.</td></tr>}</tbody>
      </table>
    </section>

    <br/>
    <section className="card">
      <div className="sectionHeading"><div><span className="eyebrow">ACTIVITY</span><h2>Recent trades</h2></div><span className="muted">Last 25 transactions</span></div>
      <table className="market">
        <thead><tr><th>Time</th><th>Player</th><th>Side</th><th>Shares</th><th>Price / share</th><th>Total</th><th>Realized P/L</th></tr></thead>
        <tbody>{recentTrades.map((tradeRow) => <tr key={tradeRow.id}>
          <td>{tradeRow.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
          <td><Link href={`/athletes/${tradeRow.athlete.slug}`}><strong>{tradeRow.athlete.name}</strong></Link><div className="muted">{tradeRow.athlete.team}</div></td>
          <td><span className={tradeRow.side === TradeSide.BUY ? "tradeBadge buyBadge" : "tradeBadge sellBadge"}>{tradeRow.side}</span></td>
          <td>{Number(tradeRow.quantity).toFixed(4)}</td>
          <td>{formatNexPoints(Number(tradeRow.price))}</td>
          <td>{formatNexPoints(Number(tradeRow.total))}</td>
          <td className={Number(tradeRow.realizedPnl) >= 0 ? "positive" : "negative"}>{tradeRow.side === TradeSide.SELL ? formatSignedNexPoints(Number(tradeRow.realizedPnl)) : "—"}</td>
        </tr>)}{recentTrades.length === 0 && <tr><td colSpan={7} className="muted">Your completed trades will appear here.</td></tr>}</tbody>
      </table>
    </section>
  </main>;
}
