import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNexPoints } from "@/lib/nexpoints";
import AutoRefresh from "@/app/components/AutoRefresh";
import WatchlistButton from "@/app/components/WatchlistButton";

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const entries = await prisma.watchlistEntry.findMany({
    where: { userId: user.id },
    include: { athlete: true },
    orderBy: { createdAt: "desc" },
  });

  return <main className="shell">
    <div className="hero"><div><p className="muted">SCOUTING BOARD</p><h1>My Watchlist</h1><p className="muted">Track players before you decide to buy.</p></div><AutoRefresh/></div>
    <section className="card marketCard">
      <div className="sectionHeading"><div><span className="eyebrow">WATCHING</span><h2>{entries.length} athletes</h2></div><Link className="button secondary" href="/discover">Find prospects</Link></div>
      <table className="market">
        <thead><tr><th>Player</th><th>Sport</th><th>Team</th><th>Price</th><th>Move</th><th>Market Cap</th><th/></tr></thead>
        <tbody>{entries.map(({ athlete }) => {
          const current = Number(athlete.currentPrice);
          const previous = Number(athlete.previousPrice);
          const move = previous > 0 ? (current - previous) / previous * 100 : 0;
          return <tr key={athlete.id}>
            <td><Link href={`/athletes/${athlete.slug}`}><strong>{athlete.name}</strong></Link><div className="muted">{athlete.position}</div></td>
            <td>{athlete.sport}</td>
            <td>{athlete.team}</td>
            <td>{formatNexPoints(current)}</td>
            <td className={move >= 0 ? "positive" : "negative"}>{move >= 0 ? "+" : ""}{move.toFixed(2)}%</td>
            <td>{formatNexPoints(Number(athlete.marketCap))}</td>
            <td><WatchlistButton athleteId={athlete.id} returnTo="/watchlist" watching/></td>
          </tr>;
        })}{entries.length === 0 && <tr><td colSpan={7} className="muted">Your watchlist is empty. Scout the Discover page and add players you want to track.</td></tr>}</tbody>
      </table>
    </section>
  </main>;
}
