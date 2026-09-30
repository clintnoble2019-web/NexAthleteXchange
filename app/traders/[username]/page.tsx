import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeSide } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatNexPoints, formatSignedNexPoints } from "@/lib/nexpoints";
import { portfolioValue, startOfCurrentWeekUtc } from "@/lib/competition";

export default async function TraderProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const weekStart = startOfCurrentWeekUtc();
  const trader = await prisma.user.findUnique({
    where: { username },
    include: {
      wallet: true,
      positions: { include: { athlete: true }, orderBy: { updatedAt: "desc" } },
      trades: { where: { side: TradeSide.SELL }, orderBy: { createdAt: "desc" }, take: 50 },
      weeklyBaselines: { where: { weekStart }, take: 1 },
    },
  });
  if (!trader) notFound();

  const currentValue = portfolioValue(Number(trader.wallet?.balance || 0), trader.positions);
  const startValue = Number(trader.weeklyBaselines[0]?.startValue || 5000);
  const weeklyPnl = currentValue - startValue;
  const weeklyReturn = startValue > 0 ? weeklyPnl / startValue * 100 : 0;
  const realized = trader.trades.reduce((sum, trade) => sum + Number(trade.realizedPnl), 0);
  const holdings = trader.positions.map((position) => {
    const value = Number(position.quantity) * Number(position.athlete.currentPrice);
    const basis = Number(position.quantity) * Number(position.averageCost);
    return { position, value, pnl: value - basis };
  }).sort((a, b) => b.pnl - a.pnl);

  return <main className="shell">
    <div className="hero"><div><p className="muted">TRADER PROFILE</p><h1>{trader.username}</h1><p className="muted">Member since {trader.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p></div><div><span className="muted">Portfolio value</span><h2>{formatNexPoints(currentValue)}</h2></div></div>

    <section className="grid fourStats">
      <div className="card"><span className="muted">Weekly return</span><h2 className={weeklyReturn >= 0 ? "positive" : "negative"}>{weeklyReturn >= 0 ? "+" : ""}{weeklyReturn.toFixed(2)}%</h2><small className="muted">{formatSignedNexPoints(weeklyPnl)}</small></div>
      <div className="card"><span className="muted">Open positions</span><h2>{trader.positions.length}</h2><small className="muted">Current holdings</small></div>
      <div className="card"><span className="muted">Realized P/L</span><h2 className={realized >= 0 ? "positive" : "negative"}>{formatSignedNexPoints(realized)}</h2><small className="muted">Closed trades</small></div>
      <div className="card"><span className="muted">Best open scout</span><h2>{holdings[0] ? holdings[0].position.athlete.name : "—"}</h2><small className={holdings[0]?.pnl && holdings[0].pnl < 0 ? "negative" : "positive"}>{holdings[0] ? formatSignedNexPoints(holdings[0].pnl) : "No positions"}</small></div>
    </section>

    <br/>
    <section className="card">
      <div className="sectionHeading"><div><span className="eyebrow">SCOUTING BOOK</span><h2>Open positions</h2></div><Link className="button secondary" href="/leaderboard">Leaderboard</Link></div>
      <table className="market"><thead><tr><th>Player</th><th>Sport</th><th>Shares</th><th>Current</th><th>Position value</th><th>P/L</th></tr></thead>
      <tbody>{holdings.slice(0, 25).map(({ position, value, pnl }) => <tr key={position.id}>
        <td><Link href={`/athletes/${position.athlete.slug}`}><strong>{position.athlete.name}</strong></Link><div className="muted">{position.athlete.team} • {position.athlete.position}</div></td>
        <td>{position.athlete.sport}</td>
        <td>{Number(position.quantity).toFixed(4)}</td>
        <td>{formatNexPoints(Number(position.athlete.currentPrice))}</td>
        <td>{formatNexPoints(value)}</td>
        <td className={pnl >= 0 ? "positive" : "negative"}>{formatSignedNexPoints(pnl)}</td>
      </tr>)}{!holdings.length && <tr><td colSpan={6} className="muted">No open positions yet.</td></tr>}</tbody></table>
    </section>
  </main>;
}
