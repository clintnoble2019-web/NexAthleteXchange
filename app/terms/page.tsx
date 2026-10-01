import Link from "next/link";
import {
  REAL_MARKET_TERMS_EFFECTIVE_DATE,
  REAL_MARKET_TERMS_PREAMBLE,
  REAL_MARKET_TERMS_SECTIONS,
  REAL_MARKET_TERMS_TITLE,
  REAL_MARKET_TERMS_VERSION,
} from "@/lib/real-market-terms";

export const metadata = { title: "Terms of Service | NexAthleteXchange" };

export default function TermsPage() {
  return <main className="shell"><article className="card" style={{maxWidth: 960, margin: "32px auto", padding: 28}}>
    <span className="tradeBadge sellBadge">MATERIAL AGREEMENT</span>
    <h1>{REAL_MARKET_TERMS_TITLE}</h1>
    <p className="muted">Version {REAL_MARKET_TERMS_VERSION} · Effective {REAL_MARKET_TERMS_EFFECTIVE_DATE}</p>

    <div className="notice">
      <strong>Important</strong>
      <p>This version materially expands the Real Market agreement. Users who accepted an earlier version must affirmatively accept this version before continuing through gated Real Market flows.</p>
    </div>

    {REAL_MARKET_TERMS_PREAMBLE.map((paragraph, index) => <p key={`preamble-${index}`}>{paragraph}</p>)}

    <p><strong>Documents incorporated into this agreement:</strong> <Link href="/privacy">Privacy Notice</Link> · <Link href="/risk-disclosure">Real Market Risk Disclosure</Link>.</p>

    {REAL_MARKET_TERMS_SECTIONS.map(section => <section key={section.title}>
      <h2>{section.title}</h2>
      {section.paragraphs.map((paragraph, index) => <p key={`${section.title}-${index}`}>{paragraph}</p>)}
    </section>)}

    <hr/>
    <p className="muted">This agreement is intentionally detailed so important product, market, funding, identity, risk, and conduct terms are presented before gated Real Market use. It is not a substitute for NexAthleteXchange completing the licensing, registration, legal-classification, payments, custody, KYC/AML, sanctions, privacy, cybersecurity, tax, and jurisdiction-specific work required before any real-money launch.</p>
  </article></main>;
}
