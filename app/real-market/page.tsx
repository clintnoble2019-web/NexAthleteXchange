import Link from "next/link";
import { realMarket } from "@/lib/real-market";

export const metadata = {
  title: "Real Market — Coming Soon | NexAthleteXchange",
  description: "The next chapter of the scouting economy: build athlete positions and trade with other scouts. Real Market is coming soon.",
};

export default function RealMarketPage() {
  return <main className="realMarketPage">
    <section className="realMarketHero shell">
      <div className="realMarketBadge">REAL MARKET • COMING SOON</div>
      <h1>A market built on scouting conviction.</h1>
      <p className="realMarketLead">Spot opportunity. Build your position. Trade with another scout. The planned Real Market brings the scouting economy to real-money athlete positions across NBA, NFL, and MLB — with trades matched between funded buyers and sellers.</p>
      <div className="realMarketStatus card">
        <div>
          <span className="eyebrow">LAUNCH STATUS</span>
          <strong>Not live yet</strong>
        </div>
        <p>No real-money deposits, withdrawals, or trades are enabled on NexAthleteXchange today. The Free Market remains fully playable with NexPoints.</p>
      </div>
      <div className="realMarketActions">
        <Link className="button landingPrimary" href="/market">Play the Free Market</Link>
        <Link className="button secondary" href="/tutorial">Learn how scouting works</Link>
      </div>
    </section>

    <section className="realMarketSection shell">
      <div className="realMarketSectionHead">
        <span className="landingEyebrow">PLANNED MARKET MODEL</span>
        <h2>Your research. Your conviction. Your next trade.</h2>
        <p className="muted">The planned launch connects scouts directly. Every completed trade needs a buyer, a seller, and a price they both accept.</p>
      </div>
      <div className="realMarketGrid">
        <article className="card realMarketCard"><span>01</span><h3>Fund your balance</h3><p>Planned funding options include bank, debit card, and USDC on Solana. Trading balances will be shown in dollar terms.</p></article>
        <article className="card realMarketCard"><span>02</span><h3>Put your scouting to work</h3><p>Use performance data to research an athlete, then choose your quantity and order price. Buy orders reserve cash plus fees; sell orders reserve positions you own.</p></article>
        <article className="card realMarketCard"><span>03</span><h3>Trade with another scout</h3><p>An order executes when a funded buyer and seller match. Planned platform fee: <strong>${realMarket.tradeFee.toFixed(2)} per executed buy or sell.</strong> Unmatched orders may wait or remain unfilled.</p></article>
        <article className="card realMarketCard"><span>04</span><h3>Manage your next move</h3><p>Keep your positions, place another order, or withdraw available settled cash to a bank or as USDC on Solana. A position must be sold before its proceeds can be withdrawn.</p></article>
      </div>
    </section>

    <section className="realMarketDark">
      <div className="shell realMarketSplit">
        <div>
          <span className="landingEyebrow lightEyebrow">THE SCOUTING ECONOMY</span>
          <h2>Performance informs conviction. Orders make the trade.</h2>
          <p>The same athlete research and performance engine will help you scout. In the Real Market, its reference price is a guide, not a guaranteed sale price. Your execution price comes from a matching order placed by another trader.</p>
          <p>Planned crypto funding and withdrawals use USDC on Solana. The trading balance is shown in dollar terms.</p>
        </div>
        <div className="realMarketSpec card">
          <div><span>Launch approach</span><strong>Matched scout orders</strong></div>
          <div><span>Trading unit</span><strong>{realMarket.currency}</strong></div>
          <div><span>Crypto network</span><strong>{realMarket.network}</strong></div>
          <div><span>Trade fee</span><strong>${realMarket.tradeFee.toFixed(2)} flat</strong></div>
          <div><span>Current status</span><strong>Coming Soon</strong></div>
        </div>
      </div>
    </section>

    <section className="realMarketSection shell">
      <div className="realMarketSectionHead">
        <span className="landingEyebrow">KNOW YOUR EXIT</span>
        <h2>A clear view of what can trade.</h2>
      </div>
      <div className="realMarketGrid realMarketThreeUp">
        <article className="card realMarketCard"><h3>Available cash is yours</h3><p>A deposit stays in your balance until you commit it to an order or withdraw it. It does not automatically become a buy order for every athlete or company revenue.</p></article>
        <article className="card realMarketCard"><h3>Market depth matters</h3><p>Buy and sell interest can differ by athlete, price, and quantity. A sale can fill partially, wait for a match, or remain unfilled. Orders can also be canceled.</p></article>
        <article className="card realMarketCard"><h3>No guaranteed buyer</h3><p>More activity can create more trading opportunities, but it does not guarantee an exit, a profit, or a sale at the reference price. Retirement and any special redemption terms must be finalized before launch.</p></article>
      </div>
    </section>

    <section className="realMarketSection shell">
      <div className="realMarketSectionHead">
        <span className="landingEyebrow">BUILT TO GROW WITH THE SCOUTS</span>
        <h2>Let real demand shape the next chapter.</h2>
      </div>
      <div className="realMarketGrid realMarketThreeUp">
        <article className="card realMarketCard"><span>01</span><h3>Start with the community</h3><p>The planned first stage matches orders between scouts. The platform connects traders rather than promising to buy every position itself.</p></article>
        <article className="card realMarketCard"><span>02</span><h3>Learn from the market</h3><p>Trading volume, funded order depth, and time to match will show where demand exists. Net fee income can support company reserves and future development; customer deposits stay separate.</p></article>
        <article className="card realMarketCard"><span>03</span><h3>Explore deeper liquidity</h3><p>Actual trading data can help us evaluate professional liquidity providers for a later stage. No provider is committed today, and additional liquidity is not a promise of instant selling.</p></article>
      </div>
    </section>

    <section className="realMarketSection shell">
      <div className="realMarketNotice card">
        <span className="landingEyebrow">FREE MARKET STAYS OPEN</span>
        <h2>Practice the scouting game now.</h2>
        <p>Free Market uses NexPoints and simulated trades at performance-driven prices. Real Market is planned around cash-backed orders matched between traders. The research experience connects them; their balances and execution models are separate.</p>
        <p>You can build your scouting track record today. Real Market identity verification will begin immediately after signup, with one account per verified person.</p>
        <Link className="button landingPrimary" href="/discover">Start scouting</Link>
      </div>
    </section>

    <footer className="realMarketDisclosure shell">
      <p>Athlete positions describe the planned product; they do not represent ownership of an athlete, team, or company. Final product terms, retirement rules, legal classification, and eligible locations must be confirmed before launch. This page describes the plan, not a live trading service.</p>
    </footer>
  </main>;
}
