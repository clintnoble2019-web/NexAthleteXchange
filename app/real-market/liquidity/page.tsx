import { isAdmin } from "@/lib/beta-controls";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LiquidityQuoteStatus, RealInstrumentStatus, RealMarketEnvironment, Sport } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { realMarket, realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { formatRealMoney } from "@/lib/real-market-sandbox";

export const metadata = {
  title: "Institutional Liquidity Sandbox | NexAthleteXchange",
  description: "Internal liquidity-provider and Real Market instrument console.",
};

export default async function LiquiditySandboxPage() {
  if (!realMarketSandboxPreviewEnabled()) redirect("/real-market");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.id)) redirect("/market");

  const environment = RealMarketEnvironment.SANDBOX;
  const now = new Date();
  const [instruments, providers, reserve, settlements] = await Promise.all([
    prisma.realMarketInstrument.findMany({
      where: { environment },
      include: {
        athlete: true,
        quotes: {
          where: { status: LiquidityQuoteStatus.ACTIVE, expiresAt: { gt: now } },
          include: { provider: { select: { code: true } } },
        },
      },
      orderBy: [{ athlete: { sport: "asc" } }, { launchRank: "asc" }],
    }),
    prisma.liquidityProvider.findMany({
      where: { environment },
      include: { wallet: true, inventory: true, quotes: { where: { status: LiquidityQuoteStatus.ACTIVE, expiresAt: { gt: now } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.realSettlementReserve.findUnique({ where: { environment } }),
    prisma.realSettlementEvent.findMany({ include: { instrument: { include: { athlete: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const activeBySport = Object.fromEntries([Sport.NBA, Sport.NFL, Sport.MLB].map((sport) => [sport, instruments.filter((item) => item.athlete.sport === sport && item.status !== RealInstrumentStatus.RETIRED).length]));
  const activeQuotes = providers.reduce((sum, provider) => sum + provider.quotes.length, 0);

  return <main className="realSandboxPage shell">
    <header className="realSandboxHeader">
      <div>
        <div className="realMarketBadge sandboxBadge">INTERNAL SANDBOX • NO REAL MONEY</div>
        <h1>Institutional Liquidity</h1>
        <p className="muted">Foundation 3 console for the 60-instrument mandate, LP accounts, quote coverage, exposure controls, and the career-ending retirement reserve.</p>
      </div>
      <div className="realMarketActions"><Link className="button secondary" href="/real-market/sandbox">Customer sandbox</Link><Link className="button secondary" href="/real-market">Coming Soon</Link></div>
    </header>

    <section className="realSandboxStats">
      <article className="card"><span>Launch universe</span><strong>{activeBySport.NBA + activeBySport.NFL + activeBySport.MLB} / {realMarket.launchUniverse.total}</strong><small>NBA {activeBySport.NBA} • NFL {activeBySport.NFL} • MLB {activeBySport.MLB}</small></article>
      <article className="card"><span>Liquidity providers</span><strong>{providers.length}</strong><small>Sandbox counterparties</small></article>
      <article className="card"><span>Active quotes</span><strong>{activeQuotes}</strong><small>Non-expired bid/ask quotes</small></article>
      <article className="card"><span>Retirement reserve</span><strong>{formatRealMoney(reserve?.balance ?? 0)}</strong><small>Platform-funded sandbox reserve</small></article>
    </section>

    <section className="realSandboxSection">
      <div className="realMarketSectionHead"><span className="landingEyebrow">LP ACCOUNTS</span><h2>Counterparty controls.</h2></div>
      {providers.length === 0 ? <div className="card realSandboxEmpty">No sandbox LP provisioned yet. Use the provisioning script after the sandbox schema is available.</div> : <div className="realSandboxTableWrap card"><table className="realSandboxTable"><thead><tr><th>Provider</th><th>Status</th><th>Cash</th><th>Inventory rows</th><th>Quotes</th><th>Limits</th><th>Heartbeat</th></tr></thead><tbody>{providers.map((provider) => <tr key={provider.id}><td>{provider.name}<small>{provider.code}</small></td><td>{provider.status}</td><td>{formatRealMoney(provider.wallet?.balance ?? 0)}</td><td>{provider.inventory.length}</td><td>{provider.quotes.length}</td><td><small>{provider.maxSpreadBps} bps • min {formatRealMoney(provider.minQuoteDepth)} depth<br/>gross {formatRealMoney(provider.maxGrossExposure)}</small></td><td>{provider.lastHeartbeatAt ? provider.lastHeartbeatAt.toISOString() : "—"}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="realSandboxSection">
      <div className="realMarketSectionHead"><span className="landingEyebrow">60-INSTRUMENT MANDATE</span><h2>Reference prices and quote coverage.</h2><p className="muted">NFL launch instruments are restricted to QB, WR, and RB. NBA and MLB include their broader position sets.</p></div>
      <div className="realSandboxTableWrap card"><table className="realSandboxTable"><thead><tr><th>Athlete</th><th>Sport</th><th>Position</th><th>Status</th><th>Reference</th><th>Bid</th><th>Ask</th><th>Retirement</th></tr></thead><tbody>{instruments.map((instrument) => {
        const bids = instrument.quotes.filter((quote) => quote.side === "BID").sort((a, b) => Number(b.price) - Number(a.price));
        const asks = instrument.quotes.filter((quote) => quote.side === "ASK").sort((a, b) => Number(a.price) - Number(b.price));
        return <tr key={instrument.id}><td>{instrument.athlete.name}<small>{instrument.athlete.team}</small></td><td>{instrument.athlete.sport}</td><td>{instrument.athlete.position}</td><td>{instrument.status}</td><td>{formatRealMoney(instrument.referencePrice)}</td><td>{bids[0] ? `${formatRealMoney(bids[0].price)} / ${Number(bids[0].remaining).toFixed(2)} (${bids[0].provider.code})` : "—"}</td><td>{asks[0] ? `${formatRealMoney(asks[0].price)} / ${Number(asks[0].remaining).toFixed(2)} (${asks[0].provider.code})` : "—"}</td><td>{instrument.retirementDeadline ? instrument.retirementDeadline.toISOString().slice(0, 10) : "—"}</td></tr>;
      })}</tbody></table></div>
    </section>

    <section className="realSandboxSection">
      <div className="realMarketSectionHead"><span className="landingEyebrow">SETTLEMENT HISTORY</span><h2>Retirement reserve audit.</h2></div>
      <div className="card activityList">{settlements.length === 0 ? <p className="muted">No automatic retirement settlements yet.</p> : settlements.map((event) => <div key={event.id}><span>{event.instrument.athlete.name}</span><strong>{formatRealMoney(event.amount)} • {event.holders} holder{event.holders === 1 ? "" : "s"}</strong><small>{event.createdAt.toISOString()}</small></div>)}</div>
    </section>

    <footer className="realSandboxFooter card"><strong>Safety boundary:</strong> this page is internal and sandbox-only. LP APIs, quotes, balances, inventory, and settlement reserve records cannot move LIVE funds while `liveFundsEnabled` is false.</footer>
  </main>;
}
