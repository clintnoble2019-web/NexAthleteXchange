import "./globals.css";
import "./milestone5.css";
import "./landing.css";
import "./real-market.css";
import { isAdmin } from "@/lib/beta-controls";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { realMarketCustomerTestEnabled } from "@/lib/real-market";

export const metadata = { title: "NexAthleteXchange", description: "Scout athletes. Trade shares. Climb the leaderboard." };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <html lang="en"><body>
    <a className="skipLink" href="#main-content">Skip to content</a>
    <nav aria-label="Main navigation" className="nav"><Link className="brand" href="/">NexAthleteXchange</Link><div className="navlinks">
      <Link href="/market">Free Market</Link><Link href="/real-market">Real Market</Link><Link href="/discover">Discover</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/tutorial">How it works</Link>{user && <Link href="/watchlist">Watchlist</Link>}<Link href="/portfolio">Portfolio</Link>
      {user && isAdmin(user.id) && <Link href="/admin">Admin</Link>}
      {user && realMarketCustomerTestEnabled() && <Link href="/real-market/test">Test Market</Link>}
      {user ? <form action="/api/auth/logout" method="post"><button className="secondary">Log out</button></form> : <Link href="/login">Log in</Link>}
    </div></nav><div id="main-content">{children}</div>
  </body></html>;
}
