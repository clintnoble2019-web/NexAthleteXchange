import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "NexAthleteXchange — Scout. Trade. Climb.",
  description: "A free-to-play sports market where real athlete performance moves virtual share prices.",
};

export default async function Home() {
  const user = await getCurrentUser();

  return <main className="landingPage">
    <section className="landingHero shell">
      <div className="landingHeroCopy">
        <span className="landingEyebrow">FREE SPORTS MARKET • NBA • NFL • MLB</span>
        <h1>Your sports knowledge is the edge.</h1>
        <p className="landingLead">Scout real athletes, buy fractional shares with NexPoints, and watch real-world performance move prices. Find the breakout before everyone else does.</p>
        <div className="landingActions">
          {user ? <Link className="button landingPrimary" href="/market">Open the market</Link> : <Link className="button landingPrimary" href="/signup">Start with N⟡5,000</Link>}
          <Link className="button secondary landingSecondary" href="/tutorial">See how it works</Link>
        </div>
        <div className="landingProof">
          <span>✓ N⟡5,000 free starting bankroll</span>
          <span>✓ Performance-driven prices</span>
          <span>✓ Weekly Scout Leaderboard</span>
        </div>
      </div>

      <div className="landingMarketDemo card" aria-label="NexAthleteXchange market overview">
        <div className="landingDemoTop"><span className="eyebrow">SCOUTING LOOP</span><span className="livePill"><span/>LIVE MARKET</span></div>
        <div className="landingDemoValue">Scout → Buy → Watch → Climb</div>
        <p className="muted">The market follows real performance — not popularity or user trading volume.</p>
        <div className="landingDemoRows">
          <div><span>Breakout watch</span><strong className="positive">Rising opportunity</strong></div>
          <div><span>Depth-player hunting</span><strong>Every tracked player open</strong></div>
          <div><span>Weekly competition</span><strong>Ranked by return %</strong></div>
        </div>
      </div>
    </section>

    <section className="landingSection shell">
      <div className="landingSectionHead"><span className="landingEyebrow">HOW IT WORKS</span><h2>Learn it in four steps.</h2><p className="muted">No fantasy draft. No salary cap. Build the portfolio you believe in.</p></div>
      <div className="landingSteps">
        <article className="card landingStep"><span>01</span><h3>Get your bankroll</h3><p>Create an account and start with N⟡5,000 in free NexPoints. NexPoints have no real-money value.</p></article>
        <article className="card landingStep"><span>02</span><h3>Scout the market</h3><p>Search NBA, NFL, and MLB players — stars, bench players, prospects, and depth pieces are all part of the market.</p></article>
        <article className="card landingStep"><span>03</span><h3>Buy your conviction</h3><p>Buy fractional athlete shares starting at 0.01. Add players to your Watchlist before you commit.</p></article>
        <article className="card landingStep"><span>04</span><h3>Let performance decide</h3><p>Real-world game performance moves athlete prices. Your portfolio value changes as your scouting calls play out.</p></article>
      </div>
    </section>

    <section className="landingDark">
      <div className="shell landingScoutSplit">
        <div>
          <span className="landingEyebrow lightEyebrow">BUILT FOR SCOUTS</span>
          <h2>Stars are obvious. Breakouts are where you prove it.</h2>
          <p>NexAthleteXchange keeps the player pool open so knowledge matters. A backup running back, rotation wing, young outfielder, or bench player can become your best call if you spot the opportunity early.</p>
          <Link className="button landingLightButton" href="/discover">Explore Discover</Link>
        </div>
        <div className="landingScoutCards">
          <div><span>🔥</span><strong>Trending Risers</strong><small>See who is moving now.</small></div>
          <div><span>🎯</span><strong>Value Watch</strong><small>Hunt lower-priced breakouts.</small></div>
          <div><span>☆</span><strong>Watchlist</strong><small>Track ideas before buying.</small></div>
          <div><span>🏆</span><strong>Scout Leaderboard</strong><small>Compete on weekly return %.</small></div>
        </div>
      </div>
    </section>

    <section className="landingSection shell">
      <div className="landingSectionHead"><span className="landingEyebrow">KNOW THE MARKET</span><h2>Two numbers. Two different meanings.</h2></div>
      <div className="landingTwoUp">
        <article className="card landingExplain"><span className="explainIcon">N⟡</span><h3>Share Price</h3><p>The virtual cost of one athlete share. It moves as our performance engine evaluates real game results.</p></article>
        <article className="card landingExplain"><span className="explainIcon">LPV</span><h3>Market Cap</h3><p>Lifetime Performance Value inside NexAthleteXchange. It reflects tracked performance value — buying, selling, and ownership do not inflate it.</p></article>
      </div>
    </section>

    <section className="landingCta shell">
      <div><span className="landingEyebrow">READY TO SCOUT?</span><h2>Build the portfolio before the crowd sees it.</h2><p className="muted">Start free, learn the market, and see where your sports knowledge ranks.</p></div>
      <div className="landingActions">
        {user ? <Link className="button landingPrimary" href="/portfolio">View my portfolio</Link> : <Link className="button landingPrimary" href="/signup">Create free account</Link>}
        <Link className="button secondary" href="/tutorial">Read the tutorial</Link>
      </div>
    </section>

    <section className="landingSection shell">
      <div className="card landingExplain">
        <span className="landingEyebrow">REAL MARKET • COMING SOON</span>
        <h2>The next chapter of the skill-based sports market.</h2>
        <p>Build athlete positions and trade with other market participants. The planned Real Market rewards skilled evaluation, disciplined pricing, and smart execution while matching funded buy and sell orders. Every sale needs a matching buyer.</p>
        <p className="muted">Real-money trading is not live. Keep sharpening your sports-market skill in the Free Market today.</p>
        <Link className="button secondary" href="/real-market">Explore the Real Market plan</Link>
      </div>
    </section>
  </main>;
}
