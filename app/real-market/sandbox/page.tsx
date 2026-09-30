import Link from "next/link";
import { redirect } from "next/navigation";
import { RealFundingRail, RealFundingType, RealMarketEnvironment, TradeSide } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { realMarket, realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { ensureSandboxRealWallet, formatRealMoney } from "@/lib/real-market-sandbox";

type Param = string | string[] | undefined;
type SandboxParams = { rm?: Param; rmError?: Param };

function first(value: Param) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata = {
  title: "Real Market Sandbox | NexAthleteXchange",
  description: "Internal sandbox for NexAthleteXchange Real Market development.",
};

export default async function RealMarketSandbox({ searchParams }: { searchParams: Promise<SandboxParams> }) {
  if (!realMarketSandboxPreviewEnabled()) redirect("/real-market");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const status = first(params.rm);
  const error = first(params.rmError);
  const environment = RealMarketEnvironment.SANDBOX;
  const wallet = await ensureSandboxRealWallet(user.id);

  const [athletes, positions, trades, funding, ledger] = await Promise.all([
    prisma.athlete.findMany({
      where: { active: true, marketEnabled: true, sport: { in: ["NBA", "NFL", "MLB"] } },
      orderBy: [{ marketCap: "desc" }, { name: "asc" }],
      take: 15,
    }),
    prisma.realPosition.findMany({
      where: { userId: user.id, environment },
      include: { athlete: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.realTrade.findMany({
      where: { userId: user.id, environment },
      include: { athlete: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.realFundingTransaction.findMany({
      where: { userId: user.id, environment },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.realLedgerEntry.findMany({
      where: { userId: user.id, environment },
      orderBy: { createdAt: "desc" },
      take: 16,
    }),
  ]);

  const holdingsValue = positions.reduce((sum, position) => {
    return sum + Number(position.quantity) * Number(position.athlete.currentPrice);
  }, 0);
  const portfolioValue = Number(wallet.balance) + holdingsValue;

  return <main className="realSandboxPage shell">
    <header className="realSandboxHeader">
      <div>
        <div className="realMarketBadge sandboxBadge">SANDBOX ONLY • NO REAL MONEY</div>
        <h1>Real Market Foundation 2</h1>
        <p className="muted">Internal test console for USD/USDC balances, ${realMarket.tradeFee.toFixed(2)} fees, persistent athlete positions, funding states, and Solana Devnet-style settlement records.</p>
      </div>
      <Link className="button secondary" href="/real-market">Back to Coming Soon</Link>
    </header>

    {status && <div className="authNotice successNotice">{status}</div>}
    {error && <div className="authNotice errorNotice">{error}</div>}

    <section className="realSandboxStats">
      <article className="card"><span>Sandbox cash</span><strong>{formatRealMoney(wallet.balance)}</strong><small>Fake USD/USDC only</small></article>
      <article className="card"><span>Holdings value</span><strong>{formatRealMoney(holdingsValue)}</strong><small>{positions.length} open position{positions.length === 1 ? "" : "s"}</small></article>
      <article className="card"><span>Portfolio value</span><strong>{formatRealMoney(portfolioValue)}</strong><small>Cash + current holdings</small></article>
      <article className="card"><span>Executed trade fee</span><strong>${realMarket.tradeFee.toFixed(2)}</strong><small>Charged on sandbox buys and sells</small></article>
    </section>

    <section className="realSandboxSection">
      <div className="realMarketSectionHead"><span className="landingEyebrow">SANDBOX FUNDING</span><h2>Simulate money movement.</h2><p className="muted">These forms create fake ledger activity only. No bank, card, wallet, or Solana mainnet connection is used.</p></div>
      <div className="realSandboxFundingGrid">
        <form className="card realSandboxForm" action="/api/real-market/sandbox/funding" method="post">
          <h3>Bank deposit</h3><input type="hidden" name="type" value={RealFundingType.DEPOSIT}/><input type="hidden" name="rail" value={RealFundingRail.BANK}/>
          <label>Fake amount<input name="amount" type="number" min="1" step="0.01" defaultValue="250" required/></label>
          <button type="submit">Simulate bank deposit</button>
        </form>
        <form className="card realSandboxForm" action="/api/real-market/sandbox/funding" method="post">
          <h3>Debit-card deposit</h3><input type="hidden" name="type" value={RealFundingType.DEPOSIT}/><input type="hidden" name="rail" value={RealFundingRail.DEBIT_CARD}/>
          <label>Fake amount<input name="amount" type="number" min="1" step="0.01" defaultValue="100" required/></label>
          <button type="submit">Simulate card deposit</button>
        </form>
        <form className="card realSandboxForm" action="/api/real-market/sandbox/funding" method="post">
          <h3>USDC Devnet deposit</h3><input type="hidden" name="type" value={RealFundingType.DEPOSIT}/><input type="hidden" name="rail" value={RealFundingRail.USDC_SOLANA}/>
          <label>Fake USDC<input name="amount" type="number" min="1" step="0.01" defaultValue="100" required/></label>
          <button type="submit">Simulate USDC deposit</button>
        </form>
      </div>
      <div className="realSandboxFundingGrid withdrawalGrid">
        <form className="card realSandboxForm" action="/api/real-market/sandbox/funding" method="post">
          <h3>Bank withdrawal</h3><input type="hidden" name="type" value={RealFundingType.WITHDRAWAL}/><input type="hidden" name="rail" value={RealFundingRail.BANK}/>
          <label>Fake amount<input name="amount" type="number" min="1" step="0.01" defaultValue="25" required/></label>
          <button className="secondary" type="submit">Simulate bank withdrawal</button>
        </form>
        <form className="card realSandboxForm" action="/api/real-market/sandbox/funding" method="post">
          <h3>USDC Devnet withdrawal</h3><input type="hidden" name="type" value={RealFundingType.WITHDRAWAL}/><input type="hidden" name="rail" value={RealFundingRail.USDC_SOLANA}/>
          <label>Fake USDC<input name="amount" type="number" min="1" step="0.01" defaultValue="25" required/></label>
          <label>Devnet wallet address<input name="externalAddress" type="text" minLength={32} maxLength={64} placeholder="Solana devnet address" required/></label>
          <button className="secondary" type="submit">Simulate USDC withdrawal</button>
        </form>
      </div>
    </section>

    <section className="realSandboxSection">
      <div className="realMarketSectionHead"><span className="landingEyebrow">SANDBOX MARKET</span><h2>Test the $2 execution model.</h2><p className="muted">Reference prices come from the same performance engine as the Free Market. Sandbox trades never move athlete prices.</p></div>
      <div className="realSandboxTableWrap card">
        <table className="realSandboxTable"><thead><tr><th>Athlete</th><th>Sport</th><th>Team</th><th>Price</th><th>Test buy</th></tr></thead><tbody>
          {athletes.map((athlete) => <tr key={athlete.id}>
            <td><Link href={`/athletes/${athlete.slug}`}>{athlete.name}</Link><small>{athlete.position}</small></td>
            <td>{athlete.sport}</td><td>{athlete.team}</td><td>{formatRealMoney(athlete.currentPrice)}</td>
            <td><form className="inlineTradeForm" action="/api/real-market/sandbox/trade" method="post"><input type="hidden" name="athleteId" value={athlete.id}/><input type="hidden" name="side" value={TradeSide.BUY}/><input aria-label={`Quantity for ${athlete.name}`} name="quantity" type="number" min="0.01" step="0.01" defaultValue="1"/><button type="submit">Buy</button></form></td>
          </tr>)}
        </tbody></table>
      </div>
    </section>

    <section className="realSandboxSection">
      <div className="realMarketSectionHead"><span className="landingEyebrow">SANDBOX PORTFOLIO</span><h2>Persistent positions.</h2></div>
      {positions.length === 0 ? <div className="card realSandboxEmpty">No sandbox holdings yet. Simulate a deposit, then test a buy above.</div> : <div className="realSandboxTableWrap card"><table className="realSandboxTable"><thead><tr><th>Athlete</th><th>Qty</th><th>All-in avg.</th><th>Current</th><th>Value</th><th>Test sell</th></tr></thead><tbody>
        {positions.map((position) => <tr key={position.id}><td>{position.athlete.name}<small>{position.athlete.team} • {position.athlete.position}</small></td><td>{Number(position.quantity).toFixed(2)}</td><td>{formatRealMoney(position.averageCost)}</td><td>{formatRealMoney(position.athlete.currentPrice)}</td><td>{formatRealMoney(Number(position.quantity) * Number(position.athlete.currentPrice))}</td><td><form className="inlineTradeForm" action="/api/real-market/sandbox/trade" method="post"><input type="hidden" name="athleteId" value={position.athleteId}/><input type="hidden" name="side" value={TradeSide.SELL}/><input name="quantity" type="number" min="0.01" max={Number(position.quantity)} step="0.01" defaultValue={Number(position.quantity).toFixed(2)}/><button className="secondary" type="submit">Sell</button></form></td></tr>)}
      </tbody></table></div>}
    </section>

    <section className="realSandboxSection realSandboxActivityGrid">
      <div><div className="realMarketSectionHead"><span className="landingEyebrow">FUNDING HISTORY</span><h2>State machine.</h2></div><div className="card activityList">{funding.length === 0 ? <p className="muted">No sandbox funding activity.</p> : funding.map((item) => <div key={item.id}><span>{item.type} • {item.rail}</span><strong>{formatRealMoney(item.amount)} • {item.status}</strong><small>{item.network || "Sandbox fiat rail"}{item.failureReason ? ` • ${item.failureReason}` : ""}</small></div>)}</div></div>
      <div><div className="realMarketSectionHead"><span className="landingEyebrow">TRADE HISTORY</span><h2>Execution audit.</h2></div><div className="card activityList">{trades.length === 0 ? <p className="muted">No sandbox trades.</p> : trades.map((trade) => <div key={trade.id}><span>{trade.side} • {trade.athlete.name}</span><strong>{Number(trade.quantity).toFixed(2)} @ {formatRealMoney(trade.price)}</strong><small>Gross {formatRealMoney(trade.gross)} • Fee {formatRealMoney(trade.fee)} • Net {formatRealMoney(trade.netCashFlow)}</small></div>)}</div></div>
      <div><div className="realMarketSectionHead"><span className="landingEyebrow">LEDGER</span><h2>Balance audit.</h2></div><div className="card activityList">{ledger.length === 0 ? <p className="muted">No sandbox ledger entries.</p> : ledger.map((entry) => <div key={entry.id}><span>{entry.type}</span><strong>{Number(entry.amount) >= 0 ? "+" : ""}{formatRealMoney(entry.amount)}</strong><small>Balance after: {formatRealMoney(entry.balance)}</small></div>)}</div></div>
    </section>

    <footer className="realSandboxFooter card"><strong>Hard safety boundary:</strong> this console cannot accept or move real funds. `liveFundsEnabled` remains false and the public Real Market stays behind the Coming Soon screen.</footer>
  </main>;
}
