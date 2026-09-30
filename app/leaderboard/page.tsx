import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { formatNexPoints, formatSignedNexPoints } from "@/lib/nexpoints";
import { loadWeeklyLeaderboard, startOfCurrentWeekUtc } from "@/lib/competition";
import AutoRefresh from "@/app/components/AutoRefresh";

export default async function LeaderboardPage() {
  const [user, leaders] = await Promise.all([getCurrentUser(), loadWeeklyLeaderboard(100)]);
  const weekStart = startOfCurrentWeekUtc();
  const currentRank = user ? leaders.findIndex((entry) => entry.userId === user.id) + 1 : 0;

  return <main className="shell">
    <div className="hero">
      <div><p className="muted">WEEKLY COMPETITION</p><h1>Scout Leaderboard</h1><p className="muted">Ranked by weekly portfolio return. Find the breakout before everybody else.</p></div>
      <div><span className="muted">Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span><h2>{currentRank ? `#${currentRank}` : "Open"}</h2><AutoRefresh/></div>
    </div>

    <section className="card">
      <div className="sectionHeading"><div><span className="eyebrow">TOP SCOUTS</span><h2>Weekly return</h2></div><span className="muted">Top 100 traders</span></div>
      <table className="market">
        <thead><tr><th>Rank</th><th>Trader</th><th>Weekly return</th><th>Weekly P/L</th><th>Portfolio value</th></tr></thead>
        <tbody>{leaders.map((entry, index) => <tr key={entry.userId} className={user?.id === entry.userId ? "leaderboardMe" : undefined}>
          <td><strong>#{index + 1}</strong></td>
          <td><Link href={`/traders/${encodeURIComponent(entry.username)}`}><strong>{entry.username}</strong></Link>{!entry.hasBaseline && <div className="smallText muted">Launch-week baseline</div>}</td>
          <td className={entry.weeklyReturn >= 0 ? "positive" : "negative"}>{entry.weeklyReturn >= 0 ? "+" : ""}{entry.weeklyReturn.toFixed(2)}%</td>
          <td className={entry.weeklyPnl >= 0 ? "positive" : "negative"}>{formatSignedNexPoints(entry.weeklyPnl)}</td>
          <td>{formatNexPoints(entry.currentValue)}</td>
        </tr>)}{leaders.length === 0 && <tr><td colSpan={5} className="muted">The first traders will appear here after signup.</td></tr>}</tbody>
      </table>
    </section>
  </main>;
}
