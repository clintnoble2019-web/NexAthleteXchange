import Link from "next/link";
import { realMarket } from "@/lib/real-market";

export const metadata = {
  title: "Real Market — Coming Soon | NexAthleteXchange",
  description: "Real-money athlete trading is being built for NexAthleteXchange.",
};

export default function RealMarketPage() {
  return <main className="realMarketPage">
    <section className="realMarketHero shell">
      <div className="realMarketBadge">REAL MARKET • COMING SOON</div>
      <h1>Scout with real stakes.</h1>
      <p className="realMarketLead">The Real Market is the next stage of NexAthleteXchange: persistent athlete positions, cash balances, fiat and crypto funding, and real withdrawals — built on top of the same scouting-first experience.</p>
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
        <h2>Simple money movement. Same scouting edge.</h2>
      </div>
      <div className="realMarketGrid">
        <article className="card realMarketCard"><span>01</span><h3>Fund your balance</h3><p>Planned funding options include bank, debit card, and USDC on Solana. Trading balances will be shown in dollar terms.</p></article>
        <article className="card realMarketCard"><span>02</span><h3>Trade athlete positions</h3><p>Buy and sell persistent athlete positions instead of one-game picks. Planned platform fee: <strong>${realMarket.tradeFee.toFixed(2)} per executed trade.</strong></p></article>
        <article className="card realMarketCard"><span>03</span><h3>Hold through performance</h3><p>Real-world athlete performance continues to drive the market experience. Positions remain in your portfolio until you sell them.</p></article>
        <article className="card realMarketCard"><span>04</span><h3>Withdraw your balance</h3><p>Planned cash-out methods are bank withdrawal or USDC on Solana. Debit-card withdrawals are not part of the planned model.</p></article>
      </div>
    </section>

    <section className="realMarketDark">
      <div className="shell realMarketSplit">
        <div>
          <span className="landingEyebrow lightEyebrow">SOLANA SETTLEMENT</span>
          <h2>Crypto underneath. Sports product on top.</h2>
          <p>The planned crypto rail is USDC on Solana so users can fund or withdraw with crypto without making SOL price volatility part of athlete pricing.</p>
        </div>
        <div className="realMarketSpec card">
          <div><span>Trading unit</span><strong>{realMarket.currency}</strong></div>
          <div><span>Crypto network</span><strong>{realMarket.network}</strong></div>
          <div><span>Trade fee</span><strong>${realMarket.tradeFee.toFixed(2)} flat</strong></div>
          <div><span>Current status</span><strong>Coming Soon</strong></div>
        </div>
      </div>
    </section>

    <section className="realMarketSection shell">
      <div className="realMarketNotice card">
        <span className="landingEyebrow">FREE MARKET STAYS OPEN</span>
        <h2>Practice the scouting game now.</h2>
        <p>The Real Market is being built separately. Nothing about this page turns on live-money functionality. You can keep building a track record in the Free Market while the next layer is developed.</p>
        <Link className="button landingPrimary" href="/discover">Start scouting</Link>
      </div>
    </section>
  </main>;
}
