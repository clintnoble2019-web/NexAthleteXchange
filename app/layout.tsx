import "./globals.css";
import "./milestone5.css";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "NexAthleteXchange", description: "Scout athletes. Trade shares. Climb the leaderboard." };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <html lang="en"><body>
    <nav className="nav"><Link className="brand" href="/market">NexAthleteXchange</Link><div className="navlinks">
      <Link href="/market">Market</Link><Link href="/discover">Discover</Link><Link href="/leaderboard">Leaderboard</Link>{user && <Link href="/watchlist">Watchlist</Link>}<Link href="/portfolio">Portfolio</Link>
      {user ? <form action="/api/auth/logout" method="post"><button className="secondary">Log out</button></form> : <Link href="/login">Log in</Link>}
    </div></nav>{children}
  </body></html>;
}
