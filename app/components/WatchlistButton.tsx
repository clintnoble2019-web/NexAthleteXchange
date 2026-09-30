export default function WatchlistButton({ athleteId, returnTo, watching }: { athleteId: string; returnTo: string; watching: boolean }) {
  return <form action="/api/watchlist" method="post">
    <input type="hidden" name="athleteId" value={athleteId}/>
    <input type="hidden" name="returnTo" value={returnTo}/>
    <button className="secondary" type="submit">{watching ? "★ Watching" : "☆ Watch"}</button>
  </form>;
}
