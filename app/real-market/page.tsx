import Link from "next/link";
import { realMarket } from "@/lib/real-market";

export const metadata = {
  title: "Real Market — Coming Soon | NexAthleteXchange",
  description: "A planned marketplace for limited-supply digital athlete collectibles, with market prices set by buyers and sellers.",
};

export default function RealMarketPage() {
  return <main className="realMarketPage">
    <section className="realMarketHero shell">
      <div className="realMarketBadge">REAL MARKET • COMING SOON</div>
      <h1>Collect athletes. Trade the market.</h1>
      <p className="realMarketLead">The planned Real Market is a marketplace for limited-supply digital athlete collectibles across NBA, NFL, and MLB. Scout the player, choose your price, and trade units with other market participants.</p>
      <div className="realMarketStatus card"><div><span className="eyebrow">LAUNCH STATUS</span><strong>Not live yet</strong></div><p>No real-money deposits, withdrawals, or trades are enabled today. The Free Market remains playable with NexPoints.</p></div>
      <div className="realMarketActions"><Link className="button landingPrimary" href="/market">Play the Free Market</Link><Link className="button secondary" href="/terms">Review Terms</Link></div>
    </section>

    <section className="realMarketSection shell">
      <div className="realMarketSectionHead"><span className="landingEyebrow">THE COLLECTIBLE MODEL</span><h2>Performance informs your research. The market sets the money price.</h2><p className="muted">NexAthleteXchange can publish a Scout Value based on sports data, but that value is not a cash entitlement. Executable prices come from bids, asks, completed trades, and available depth.</p></div>
      <div className="realMarketGrid">
        <article className="card realMarketCard"><span>01</span><h3>Limited supply</h3><p>Each live athlete series will have a disclosed maximum number of digital collectible units and a disclosed allocation policy. Units do not represent athlete, team, or company ownership.</p></article>
        <article className="card realMarketCard"><span>02</span><h3>Scout Value</h3><p>Sports performance, statistics, and research produce an informational Scout Value. It helps you evaluate an athlete but does not guarantee a sale price, payout, or redemption.</p></article>
        <article className="card realMarketCard"><span>03</span><h3>Market price</h3><p>Buyers and sellers determine actual trading prices through the order book. Orders may fill, partially fill, wait, or remain unfilled.</p></article>
        <article className="card realMarketCard"><span>04</span><h3>Own until you trade</h3><p>A collectible unit remains in your account until it is sold or handled under a disclosed lifecycle rule. A game ending does not automatically settle the unit like a bet.</p></article>
      </div>
    </section>

    <section className="realMarketDark"><div className="shell realMarketSplit"><div><span className="landingEyebrow lightEyebrow">MARKETPLACE, NOT A PAYOUT FORMULA</span><h2>There is no automatic cash reward for an athlete's box score.</h2><p>A great performance may influence demand, just as athlete performance can influence interest in sports cards and other collectibles. NexAthleteXchange does not promise that a statistical result mechanically creates a cash payment.</p><p>Planned funding may include USD and {realMarket.cryptoAsset} on {realMarket.network}, subject to identity, sanctions, location, custody, and payment eligibility controls.</p></div><div className="realMarketSpec card"><div><span>Product</span><strong>Digital athlete collectibles</strong></div><div><span>Research metric</span><strong>{realMarket.referenceLabel}</strong></div><div><span>Cash price</span><strong>Order book</strong></div><div><span>Guaranteed redemption</span><strong>No</strong></div><div><span>Current status</span><strong>Coming Soon</strong></div></div></div></section>

    <section className="realMarketSection shell">
      <div className="realMarketSectionHead"><span className="landingEyebrow">KNOW THE MARKET</span><h2>Collectible ownership does not guarantee liquidity.</h2></div>
      <div className="realMarketGrid realMarketThreeUp">
        <article className="card realMarketCard"><h3>No guaranteed buyer</h3><p>A unit can become illiquid. NexAthleteXchange does not promise to buy every collectible back or guarantee a minimum value.</p></article>
        <article className="card realMarketCard"><h3>Market integrity controls</h3><p>Wash trading, manipulation, false-volume schemes, multi-accounting, fraud, and attempts to bypass location or identity restrictions are prohibited.</p></article>
        <article className="card realMarketCard"><h3>Identity before live money</h3><p>Live use will require current Terms acceptance plus production identity, age, sanctions, location, and payment eligibility checks.</p></article>
      </div>
    </section>

    <section className="realMarketSection shell"><div className="realMarketNotice card"><span className="landingEyebrow">DISCLOSURES</span><h2>Know what you are buying.</h2><p>Digital athlete collectibles are not equity in an athlete, team, league, or NexAthleteXchange; do not pay dividends; and do not give a contractual claim to athlete earnings. Values can fall to zero and resale is not guaranteed.</p><div className="realMarketActions"><Link className="button secondary" href="/terms">Terms of Service</Link><Link className="button secondary" href="/risk-disclosure">Risk Disclosure</Link><Link className="button secondary" href="/privacy">Privacy Notice</Link></div></div></section>

    <footer className="realMarketDisclosure shell"><p>This page describes a planned product. Live funds remain disabled. Availability, supported locations, payment rails, and final production rules must be enabled only after the required identity, sanctions, geolocation, custody/payment, surveillance, and withdrawal controls are operational.</p></footer>
  </main>;
}
