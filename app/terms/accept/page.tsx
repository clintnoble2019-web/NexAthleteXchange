import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasAcceptedCurrentTerms, REAL_MARKET_TERMS_VERSION } from "@/lib/real-market-compliance";
import { safeReturnTo } from "@/lib/request-security";

type Params = { next?: string; error?: string };

export default async function AcceptTerms({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent("/terms/accept")}`);
  const next = safeReturnTo(params.next, "/market");
  if (await hasAcceptedCurrentTerms(user.id)) redirect(next);

  return <main className="shell"><section className="card form" style={{maxWidth: 760, margin: "32px auto"}}>
    <span className="tradeBadge sellBadge">REQUIRED ACCOUNT AGREEMENT</span>
    <h1>Review and accept the Terms</h1>
    <p>Before continuing, confirm the account, eligibility, digital-collectible, and electronic-record rules for NexAthleteXchange.</p>
    {params.error && <div role="alert" className="notice errorNotice">{params.error === "required" ? "Accept every required acknowledgement and provide your current location." : "The agreement could not be recorded. Please try again."}</div>}

    <div className="notice">
      <strong>Real Market model</strong>
      <p>Real Market collectibles are limited-supply digital athlete units. They are not ownership in an athlete, team, or NexAthleteXchange. Scout/performance values are research only. Cash prices come from bids, asks, and completed market trades. There is no guaranteed buyer, profit, or redemption.</p>
    </div>

    <form action="/api/terms/accept" method="post">
      <input type="hidden" name="next" value={next}/>
      <label>Country code<input name="country" defaultValue="US" minLength={2} maxLength={3} pattern="[A-Za-z]{2,3}" required/></label>
      <label>State / province / region<input name="region" placeholder="CA" minLength={2} maxLength={40} required/></label>

      <label><input type="checkbox" name="ageConfirmed" value="yes" required/> I confirm I am at least 18 years old and legally able to enter this agreement.</label>
      <label><input type="checkbox" name="locationConfirmed" value="yes" required/> I confirm my country and region are accurate and I will not use a VPN, proxy, false address, or another person's identity to bypass eligibility restrictions.</label>
      <label><input type="checkbox" name="riskConfirmed" value="yes" required/> I understand digital athlete collectibles can lose value or become illiquid and are not guaranteed investments, payouts, or redemptions.</label>
      <label><input type="checkbox" name="agreementConfirmed" value="yes" required/> I have read and agree to the <Link href="/terms" target="_blank">Terms of Service</Link>, <Link href="/privacy" target="_blank">Privacy Notice</Link>, and <Link href="/risk-disclosure" target="_blank">Risk Disclosure</Link>.</label>
      <label><input type="checkbox" name="electronicConsent" value="yes" required/> I consent to electronic records, disclosures, notices, and this electronic signature.</label>

      <button type="submit">Accept and continue</button>
    </form>
    <p className="muted">Agreement version: {REAL_MARKET_TERMS_VERSION}. NexAthleteXchange records the version, timestamp, and hashed security metadata so acceptance can be audited without storing a raw IP address in the acceptance record.</p>
  </section></main>;
}
