import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  hasAcceptedCurrentTerms,
  REAL_MARKET_TERMS_EFFECTIVE_DATE,
  REAL_MARKET_TERMS_VERSION,
} from "@/lib/real-market-compliance";
import { safeReturnTo } from "@/lib/request-security";

type Params = { next?: string; error?: string };

export default async function AcceptTerms({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent("/terms/accept")}`);
  const next = safeReturnTo(params.next, "/market");
  if (await hasAcceptedCurrentTerms(user.id)) redirect(next);

  return <main className="shell"><section className="card form" style={{maxWidth: 820, margin: "32px auto"}}>
    <span className="tradeBadge sellBadge">RE-SIGNATURE REQUIRED</span>
    <h1>Review and accept the updated Terms</h1>
    <p>The Real Market agreement was materially expanded. Your earlier acceptance does not carry forward to version {REAL_MARKET_TERMS_VERSION}. Review the current documents and affirm each required acknowledgement before continuing.</p>
    {params.error && <div role="alert" className="notice errorNotice">Complete every required acknowledgement, enter your current location, type <strong>I AGREE</strong>, and submit again.</div>}

    <div className="notice">
      <strong>What changed</strong>
      <p>The updated agreement adds detailed rules for eligibility, KYC and sanctions controls, fixed supply, market making, order execution, liquidity risk, athlete events, funding and custody, withdrawals, fees, taxes, market manipulation, account security, electronic records, service interruptions, suspension, liability, disputes, re-acceptance, and live-launch compliance conditions.</p>
    </div>

    <div className="notice">
      <strong>Real Market model</strong>
      <p>Real Market collectibles are limited-supply digital athlete units. They do not give you ownership of an athlete, team, league, or NexAthleteXchange. Scout/performance values are research references. Cash prices come from executable market orders and available liquidity. There is no guaranteed buyer, profit, return, or redemption.</p>
    </div>

    <p><Link href="/terms" target="_blank"><strong>Open the full Terms of Service and Real Market Agreement</strong></Link> · <Link href="/privacy" target="_blank">Privacy Notice</Link> · <Link href="/risk-disclosure" target="_blank">Risk Disclosure</Link></p>

    <form action="/api/terms/accept" method="post">
      <input type="hidden" name="next" value={next}/>
      <label>Country code<input name="country" defaultValue="US" minLength={2} maxLength={3} pattern="[A-Za-z]{2,3}" required/></label>
      <label>State / province / region<input name="region" placeholder="CA" minLength={2} maxLength={60} required/></label>

      <label><input type="checkbox" name="ageConfirmed" value="yes" required/> I confirm I am at least 18 years old, meet any higher local age requirement, and have legal capacity to enter this agreement.</label>
      <label><input type="checkbox" name="locationConfirmed" value="yes" required/> I confirm my country and region are accurate and I will not use a VPN, proxy, false address, location spoofing, or another person's identity to bypass eligibility restrictions.</label>
      <label><input type="checkbox" name="accountOwnerConfirmed" value="yes" required/> I am using my own account and will not share, sell, lend, or operate a Real Market account for another person.</label>
      <label><input type="checkbox" name="identityComplianceConfirmed" value="yes" required/> I understand live access may require identity, age, sanctions, wallet, location, source-of-funds, fraud, and transaction-monitoring checks, and access may be restricted when required by law or provider rules.</label>
      <label><input type="checkbox" name="productNatureConfirmed" value="yes" required/> I understand athlete collectibles do not give me ownership of an athlete, team, league, company, salary, endorsement income, dividends, voting rights, or guaranteed future cash flows.</label>
      <label><input type="checkbox" name="marketRiskConfirmed" value="yes" required/> I understand collectible prices can fall sharply, liquidity can disappear, orders can partially fill or never fill, and I can lose the full amount spent.</label>
      <label><input type="checkbox" name="fundingRiskConfirmed" value="yes" required/> I understand live funding and withdrawals may be subject to settlement, holds, provider restrictions, sanctions screening, wallet risks, blockchain risks, chargebacks, and transaction limits. Fake sandbox cash has no withdrawal value.</label>
      <label><input type="checkbox" name="prohibitedConductConfirmed" value="yes" required/> I agree not to engage in wash trading, spoofing, manipulation, collusion, multi-accounting, sanctions evasion, fraud, account sharing, or intentional exploitation of system errors.</label>
      <label><input type="checkbox" name="liveLaunchConfirmed" value="yes" required/> I understand accepting these Terms does not mean real-money activity is licensed, approved, or available; live access remains subject to final legal, jurisdiction, provider, and operational approval.</label>
      <label><input type="checkbox" name="agreementConfirmed" value="yes" required/> I have read and agree to the current <Link href="/terms" target="_blank">Terms of Service and Real Market Agreement</Link>, <Link href="/privacy" target="_blank">Privacy Notice</Link>, and <Link href="/risk-disclosure" target="_blank">Real Market Risk Disclosure</Link>.</label>
      <label><input type="checkbox" name="electronicConsent" value="yes" required/> I consent to electronic records, disclosures, notices, transaction communications, and use of this electronic signature.</label>
      <label><input type="checkbox" name="electronicAccessConfirmed" value="yes" required/> I confirm I can access these electronic documents on this device and can save or print them for my records.</label>

      <label>Electronic signature — type I AGREE<input name="signatureText" autoComplete="off" pattern="[Ii] [Aa][Gg][Rr][Ee][Ee]" placeholder="I AGREE" required/></label>

      <button type="submit">Sign updated Terms and continue</button>
    </form>
    <p className="muted">Agreement version: {REAL_MARKET_TERMS_VERSION} · Effective {REAL_MARKET_TERMS_EFFECTIVE_DATE}. NexAthleteXchange records the version, cryptographic document digest, acceptance timestamp, acknowledgement set, signature method, and hashed request metadata so acceptance can be audited without storing a raw IP address in the acceptance event.</p>
  </section></main>;
}
