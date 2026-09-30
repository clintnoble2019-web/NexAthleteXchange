import Link from "next/link";

export const metadata = {
  title: "How to Play — NexAthleteXchange",
  description: "Learn how scouting, athlete shares, NexPoints, live pricing, Market Cap, Watchlists, and weekly competition work.",
};

const steps = [
  ["1", "Create your account", "You start with N⟡5,000 in free NexPoints. NexPoints are virtual game currency and have no real-money value."],
  ["2", "Pick your sport", "Open the Market and choose NBA, NFL, or MLB. You can search by player, team, and position, then sort by price or Market Cap."],
  ["3", "Scout before you buy", "Use Discover to find risers, fallers, lower-priced value candidates, and deeper scouting opportunities. Add interesting players to your Watchlist."],
  ["4", "Buy athlete shares", "Choose how many shares you want. Fractional shares start at 0.01, so you do not need enough NexPoints for a whole share."],
  ["5", "Watch real games matter", "Real-world performance feeds the pricing engine. Prices update automatically as tracked game performance changes."],
  ["6", "Manage your portfolio", "Your Portfolio shows holdings, current value, unrealized P/L, today's winners and losers, and which players are helping or hurting your results."],
  ["7", "Climb the Scout Leaderboard", "The weekly leaderboard ranks traders by portfolio return percentage, so newer players can compete without needing the largest account balance."],
];

export default function TutorialPage() {
  return <main className="shell tutorialPage">
    <section className="tutorialHero">
      <span className="landingEyebrow">NEXATHLETEXCHANGE TUTORIAL</span>
      <h1>Scout smarter. Build your portfolio. Prove your eye.</h1>
      <p className="landingLead">NexAthleteXchange is a free sports-market game built around one question: can you identify player value before everyone else does?</p>
      <div className="landingActions"><Link className="button landingPrimary" href="/signup">Start with N⟡5,000</Link><Link className="button secondary" href="/market">Open the market</Link></div>
    </section>

    <section className="tutorialSteps">
      {steps.map(([number, title, text]) => <article className="card tutorialStep" key={number}>
        <span className="tutorialNumber">{number}</span>
        <div><h2>{title}</h2><p>{text}</p></div>
      </article>)}
    </section>

    <section className="tutorialSection">
      <div className="landingSectionHead"><span className="landingEyebrow">THE CORE IDEA</span><h2>Performance moves the market.</h2></div>
      <div className="landingTwoUp">
        <article className="card landingExplain"><span className="explainIcon">N⟡</span><h3>Share Price</h3><p>This is what you pay for one athlete share. The pricing engine responds to tracked real-world performance. User buying and selling do not directly pump the price.</p></article>
        <article className="card landingExplain"><span className="explainIcon">LPV</span><h3>Market Cap</h3><p>Market Cap means Lifetime Performance Value inside NexAthleteXchange. It accumulates tracked performance value. Trading volume, ownership, and hype do not increase it.</p></article>
      </div>
    </section>

    <section className="card tutorialCallout">
      <div><span className="landingEyebrow">SCOUTING PHILOSOPHY</span><h2>Everybody active and tracked can matter.</h2></div>
      <p>The market is intentionally open. You are not limited to stars. If you think a bench player, backup, prospect, role player, or depth piece is about to earn an opportunity, you can scout and trade them too.</p>
      <strong>Find the breakout before everyone else does.</strong>
    </section>

    <section className="tutorialSection">
      <div className="landingSectionHead"><span className="landingEyebrow">QUICK GLOSSARY</span><h2>Terms you will see.</h2></div>
      <div className="tutorialGlossary">
        <div className="card"><strong>N⟡ / NexPoints</strong><p>Free virtual currency used to buy and sell athlete shares.</p></div>
        <div className="card"><strong>LPV</strong><p>Lifetime Performance Value, the performance-based value behind Market Cap.</p></div>
        <div className="card"><strong>Unrealized P/L</strong><p>Your current gain or loss on a holding before you sell it.</p></div>
        <div className="card"><strong>Watchlist</strong><p>A private list of athletes you want to monitor before or after buying.</p></div>
        <div className="card"><strong>OF</strong><p>MLB abbreviation for Outfielder. It is a general label when a player is not pinned specifically to LF, CF, or RF.</p></div>
        <div className="card"><strong>Weekly Return %</strong><p>The percentage change in your portfolio value from the weekly starting baseline used for leaderboard ranking.</p></div>
      </div>
    </section>

    <section className="tutorialSection">
      <div className="landingSectionHead"><span className="landingEyebrow">GOOD FIRST MOVE</span><h2>Do not spend all N⟡5,000 at once.</h2><p className="muted">A simple beginner approach keeps the game interesting and gives you room to react.</p></div>
      <div className="tutorialStrategy">
        <div className="card"><span>40%</span><strong>Core players</strong><p>Players you believe have a strong, dependable performance base.</p></div>
        <div className="card"><span>30%</span><strong>Breakout bets</strong><p>Lower-priced players where you think opportunity or role is improving.</p></div>
        <div className="card"><span>30%</span><strong>Keep available</strong><p>Hold NexPoints so you can react to injuries, role changes, hot streaks, and new opportunities.</p></div>
      </div>
    </section>

    <section className="landingCta tutorialFinish">
      <div><span className="landingEyebrow">YOU'RE READY</span><h2>Now go find somebody the market is sleeping on.</h2><p className="muted">Scout. Buy. Watch the games. Adjust. Climb.</p></div>
      <div className="landingActions"><Link className="button landingPrimary" href="/discover">Start scouting</Link><Link className="button secondary" href="/market">Browse all players</Link></div>
    </section>
  </main>;
}
