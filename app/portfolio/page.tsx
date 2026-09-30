import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNexPoints, formatSignedNexPoints } from "@/lib/nexpoints";

export default async function Portfolio() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const positions = await prisma.position.findMany({ where: { userId: user.id }, include: { athlete: true }, orderBy: { updatedAt: "desc" } });
  const holdings = positions.reduce((sum, p) => sum + Number(p.quantity) * Number(p.athlete.currentPrice), 0);
  const cost = positions.reduce((sum, p) => sum + Number(p.quantity) * Number(p.averageCost), 0);
  const cash = Number(user.wallet?.balance || 0);
  const pnl = holdings - cost;

  return <main className="shell">
    <div className="hero"><div><p className="muted">MY PORTFOLIO</p><h1>{user.username}</h1></div></div>
    <section className="grid stats">
      <div className="card"><span className="muted">Portfolio value</span><h2>{formatNexPoints(cash + holdings)}</h2></div>
      <div className="card"><span className="muted">NexPoints balance</span><h2>{formatNexPoints(cash)}</h2></div>
      <div className="card"><span className="muted">Unrealized P/L</span><h2 className={pnl >= 0 ? "positive" : "negative"}>{formatSignedNexPoints(pnl)}</h2></div>
    </section>
    <br/>
    <section className="card">
      <h2>Holdings</h2>
      <table className="market">
        <thead><tr><th>Player</th><th>Units</th><th>Avg cost</th><th>Value</th><th>P/L</th><th>Trade</th></tr></thead>
        <tbody>{positions.map((p) => {
          const value = Number(p.quantity) * Number(p.athlete.currentPrice);
          const basis = Number(p.quantity) * Number(p.averageCost);
          const rowPnl = value - basis;
          return <tr key={p.id}>
            <td><strong>{p.athlete.name}</strong><div className="muted">{p.athlete.sport} • {p.athlete.team}</div></td>
            <td>{Number(p.quantity).toFixed(4)}</td>
            <td>{formatNexPoints(Number(p.averageCost))}</td>
            <td>{formatNexPoints(value)}</td>
            <td className={rowPnl >= 0 ? "positive" : "negative"}>{formatSignedNexPoints(rowPnl)}</td>
            <td><form className="tradeform" action="/api/trade" method="post"><input type="hidden" name="athleteId" value={p.athleteId}/><input type="hidden" name="side" value="SELL"/><input type="hidden" name="returnTo" value="/portfolio"/><input name="quantity" type="number" min="0.01" step="0.01" max={Number(p.quantity)} defaultValue={Number(p.quantity)}/><button>Sell</button></form></td>
          </tr>;
        })}{positions.length === 0 && <tr><td colSpan={6} className="muted">No holdings yet. Buy your first athlete from the market.</td></tr>}</tbody>
      </table>
    </section>
  </main>;
}
