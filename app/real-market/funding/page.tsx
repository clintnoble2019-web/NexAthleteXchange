import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";
import { realMarketCustomerTestEnabled } from "@/lib/real-market";
import { circleBlockchain, circleConfigured } from "@/lib/circle-wallets";
import { circleComplianceConfigured } from "@/lib/circle-compliance";
import { fundingStatus } from "@/lib/provider-funding";
import { providerIdentityVerified } from "@/lib/provider-identity";

export const metadata = { title: "USDC Funding | NexAthleteXchange", robots: { index: false, follow: false } };

export default async function FundingPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  if (!realMarketCustomerTestEnabled()) redirect("/real-market");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasAcceptedCurrentTerms(user.id))) redirect("/terms/accept?next=/real-market/funding");
  if (!(await providerIdentityVerified(user.id))) redirect("/real-market/verify?provider=1&next=/real-market/funding");

  const params = await searchParams;
  const configured = circleConfigured();
  const screening = circleComplianceConfigured();
  const settlement = Boolean(process.env.CIRCLE_SETTLEMENT_WALLET_ID?.trim());
  const status = await fundingStatus(user.id);
  const providerAvailable = Number(status.providerAvailable);

  return <main className="shell"><section className="card" style={{maxWidth: 960, margin: "32px auto", padding: 28}}>
    <span className="tradeBadge">PROVIDER FUNDING · TESTNET</span>
    <h1>USDC funding</h1>
    <p>Test provider-controlled USDC on Solana Devnet. Devnet USDC has no real monetary value. Mainnet remains disabled.</p>
    {params.notice && <div role="status" className="notice">{params.notice}</div>}
    {params.error && <div role="alert" className="notice">{params.error}</div>}

    <div className="notice">
      <strong>Readiness</strong><br/>
      Persona KYC: verified · Circle wallet API: {configured ? "configured" : "not configured"} · Address screening: {screening ? "enabled" : "not enabled"} · Settlement wallet: {settlement ? "configured" : "not configured"} · Network: {circleBlockchain()}
    </div>

    <div className="notice">
      <strong>Fake market cash is isolated</strong><br/>
      Test-market cash, test trading gains, and open-order balances have no withdrawal value and are never converted into USDC. Only Devnet USDC actually credited through the provider test flow can be withdrawn here.
    </div>

    <h2>Deposit USDC</h2>
    {!configured ? <p className="muted">Circle credentials, entity secret, wallet set, and the Solana Devnet USDC token ID must be configured by the operator before provider funding can run.</p> : !status.wallet ? <form action="/api/real-market/usdc/account" method="post"><button>Create secure Devnet deposit wallet</button></form> : <>
      <p>Send only <strong>Solana Devnet USDC</strong> to this test address. Unsupported assets or networks are not credited.</p>
      <div className="notice"><strong>Deposit address</strong><br/><code style={{overflowWrap:"anywhere"}}>{status.wallet.address}</code><br/><small>Circle wallet {status.wallet.walletId} · {status.wallet.blockchain}</small></div>
      <form action="/api/real-market/usdc/sync" method="post"><button>Check confirmations &amp; sync funding</button></form>
    </>}

    <h2>Withdraw provider-funded Devnet USDC</h2>
    <p>Provider-funded Devnet USDC available: <strong>{providerAvailable.toFixed(2)} USDC</strong>.</p>
    {!configured || !screening || !settlement ? <p className="muted">Withdrawals remain blocked until Circle Wallets, standalone address screening, and the test settlement wallet are all configured.</p> : providerAvailable < 1 ? <p className="muted">No provider-funded Devnet USDC is available to withdraw. Fake Real Market cash is intentionally excluded.</p> : <form action="/api/real-market/usdc/withdraw" method="post" className="form">
      <label>Amount (USDC)<input name="amount" type="number" min="1" max={Math.min(10000, providerAvailable)} step="0.01" defaultValue={Math.min(25, providerAvailable).toFixed(2)} required/></label>
      <label>Solana Devnet destination<input name="destination" autoComplete="off" required/></label>
      <label style={{display:"flex", gap:10, alignItems:"flex-start"}}><input type="checkbox" name="confirm" value="YES" required style={{width:"auto"}}/><span>I confirm the destination, amount, USDC token, and <strong>Solana Devnet</strong> network. I understand blockchain transfers may be irreversible.</span></label>
      <button>Submit screened withdrawal</button>
    </form>}

    <h2>Funding activity</h2>
    {!status.transfers.length ? <p className="muted">No provider funding activity yet.</p> : <div style={{overflowX:"auto"}}><table><thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Network</th><th>Created</th></tr></thead><tbody>{status.transfers.map(item => <tr key={item.id}><td>{item.type}</td><td>{Number(item.amount).toFixed(2)} {item.asset}</td><td>{item.status}</td><td>{item.network || "—"}</td><td>{item.createdAt.toLocaleString()}</td></tr>)}</tbody></table></div>}

    <hr/>
    <p className="muted">This testnet integration is an engineering control, not authorization to offer real-money activity. A live launch still requires approved jurisdictions, production KYC/sanctions configuration, custody/payment approval, reconciliation, monitoring, and final operational review.</p>
    <Link className="button secondary" href="/real-market/test">Back to Real Market</Link> <Link className="button secondary" href="/risk-disclosure">Risk disclosure</Link>
  </section></main>;
}
