import Link from "next/link";
import { Sport } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatNexPoints, NEXPOINTS_SYMBOL } from "@/lib/nexpoints";

export default async function Market({ searchParams }: { searchParams: Promise<{ sport?: string; team?: string }> }) {
  const params = await searchParams;
  const sport = params.sport === "MLB" ? Sport.MLB : Sport.NBA;
  const team = params.team?.toUpperCase();
  const [user, athletes, teams] = await Promise.all([
    getCurrentUser(),
    prisma.athlete.findMany({ where: { sport, active: true, marketEnabled: true, ...(team ? { team } : {}) }, orderBy: { performance: "desc" } }),
    prisma.team.findMany({ where: { sport, active: true }, orderBy: { name: "asc" } })
  ]);

  const sportName = sport === Sport.NBA ? "NBA" : "MLB";

  return <main className="shell">
    <div className="hero">
      <div>
        <p className="muted">FREE MARKET • NBA + MLB</p>
        <h1>{sportName} Athlete Market</h1>
        <p className="muted">Trade performance with NexPoints. Build your portfolio.</p>
      </div>
      {user ? <div><span className="muted">NexPoints balance</span><h2>{formatNexPoints(Number(user.wallet?.balance || 0))}</h2></div> : <Link className="button" href="/signup">Start with {NEXPOINTS_SYMBOL}5,000</Link>}
    </div>

    <div className="sportTabs" aria-label="Launch sports">
      <Link className={sport === Sport.NBA ? "sportTab active" : "sportTab"} href="/market?sport=NBA">NBA</Link>
      <Link className={sport === Sport.MLB ? "sportTab active" : "sportTab"} href="/market?sport=MLB">MLB</Link>
    </div>

    <section className="teamsBlock">
      <div className="sectionHeading"><div><span className="eyebrow">TEAMS</span><h2>Browse by team</h2></div><span className="muted">Roster source: BALLDONTLIE-ready</span></div>
      <div className="teamStrip">
        <Link className={!team ? "teamChip selected" : "teamChip"} href={`/market?sport=${sportName}`}><span className="teamMark">ALL</span><strong>All Teams</strong></Link>
        {teams.map((item) => <Link className={team === item.abbreviation ? "teamChip selected" : "teamChip"} key={item.id} href={`/market?sport=${sportName}&team=${item.abbreviation}`}><span className="teamMark">{item.abbreviation}</span><strong>{item.name}</strong></Link>)}
      </div>
    </section>

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
            <td className="price">{formatNexPoints(current)}</td>
            <td className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</td>
            <td className="hide-mobile">{athlete.performance}</td>
            <td>{user ? <form className="tradeform" action="/api/trade" method="post">
              <input type="hidden" name="athleteId" value={athlete.id}/>
              <input type="hidden" name="side" value="BUY"/>
              <input type="hidden" name="returnTo" value={`/market?sport=${sportName}${team ? `&team=${team}` : ""}`}/>
              <input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1"/>
              <button>Buy</button>
            </form> : <Link className="button" href="/login">Log in</Link>}</td>
          </tr>;
        })}</tbody>
      </table>
      {athletes.length === 0 && <p className="muted emptyState">No market-ready athletes for this team yet. BALLDONTLIE roster sync can import the full roster; pricing activation comes next.</p>}
    </section>
  </main>;
}
