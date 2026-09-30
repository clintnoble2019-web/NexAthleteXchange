import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export default async function Market() {
  const [user, athletes] = await Promise.all([
    getCurrentUser(),
    prisma.athlete.findMany({ where: { sport: "MLB", active: true }, orderBy: { performance: "desc" } })
  ]);

  return <main className="shell">
    <div className="hero">
      <div>
        <p className="muted">FREE MARKET • MLB</p>
        <h1>Athlete Market</h1>
        <p className="muted">Trade performance. Build your portfolio.</p>
      </div>
      {user ? <div><span className="muted">Virtual cash</span><h2>${Number(user.wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2></div> : <Link className="button" href="/signup">Start with $100K</Link>}
    </div>

    <section className="card">
      <table className="market">
        <thead><tr><th>Player</th><th>Team</th><th>Price</th><th>Move</th><th className="hide-mobile">Score</th><th>Trade</th></tr></thead>
        <tbody>{athletes.map((athlete) => {
          const current = Number(athlete.currentPrice);
          const previous = Number(athlete.previousPrice);
          const move = previous > 0 ? ((current - previous) / previous) * 100 : 0;
          return <tr key={athlete.id}>
            <td><Link href={`/athletes/${athlete.slug}`}><strong>{athlete.name}</strong></Link><div className="muted">{athlete.position}</div></td>
            <td>{athlete.team}</td>
            <td className="price">${current.toFixed(2)}</td>
            <td className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</td>
            <td className="hide-mobile">{athlete.performance}</td>
            <td>{user ? <form className="tradeform" action="/api/trade" method="post">
              <input type="hidden" name="athleteId" value={athlete.id}/>
              <input type="hidden" name="side" value="BUY"/>
              <input type="hidden" name="returnTo" value="/market"/>
              <input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1"/>
              <button>Buy</button>
            </form> : <Link className="button" href="/login">Log in</Link>}</td>
          </tr>;
        })}</tbody>
      </table>
    </section>
  </main>;
}
