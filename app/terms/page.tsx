import Link from "next/link";
import { REAL_MARKET_TERMS_EFFECTIVE_DATE, REAL_MARKET_TERMS_VERSION } from "@/lib/real-market-compliance";

export const metadata = { title: "Terms of Service | NexAthleteXchange" };

export default function TermsPage() {
  return <main className="shell"><article className="card" style={{maxWidth: 920, margin: "32px auto", padding: 28}}>
    <h1>NexAthleteXchange Terms of Service</h1>
    <p className="muted">Version {REAL_MARKET_TERMS_VERSION} · Effective {REAL_MARKET_TERMS_EFFECTIVE_DATE}</p>
    <p>These Terms govern use of NexAthleteXchange, including the Free Market, research tools, simulated Real Market environments, and any future live Real Market made available in an eligible location. By accepting these Terms, you agree to the rules below and to the <Link href="/privacy">Privacy Notice</Link> and <Link href="/risk-disclosure">Real Market Risk Disclosure</Link>.</p>

    <h2>1. Eligibility and account rules</h2>
    <p>You must be at least 18 years old and legally able to enter a binding agreement. Live Real Market access may be restricted by country, state, province, sanctions rules, payment-provider rules, or other eligibility requirements. You must provide accurate identity and location information and may not use a VPN, proxy, false address, another person's identity, or other method to defeat eligibility controls. One verified person may maintain only one Real Market account unless NexAthleteXchange expressly approves otherwise.</p>

    <h2>2. What Real Market collectibles are</h2>
    <p>The planned Real Market uses limited-supply digital athlete collectibles or units associated with named professional athletes. A unit is a digital marketplace item recorded by NexAthleteXchange. It does not represent ownership of an athlete, team, league, NexAthleteXchange, an athlete's salary, endorsement income, intellectual-property rights, equity, debt, a dividend, or a contractual claim on future athlete earnings.</p>
    <p>NexAthleteXchange may publish performance data, Scout Values, rankings, charts, and research. These are informational research signals. They do not create a right to receive cash and do not establish a guaranteed market price. The cash trading price of a Real Market collectible is determined by executable bids, asks, completed transactions, and available market depth.</p>

    <h2>3. No guaranteed value, profit, buyer, or redemption</h2>
    <p>Collectible values can rise, fall, or become illiquid. An order can remain open, fill partially, or never fill. NexAthleteXchange does not guarantee a buyer, seller, minimum value, profit, return, appreciation, resale price, or redemption at a Scout Value or performance reference. Unless a specific written promotion expressly states otherwise, NexAthleteXchange has no obligation to repurchase a collectible.</p>

    <h2>4. Supply, issuance, and market integrity</h2>
    <p>Each Real Market athlete series will have a disclosed maximum supply and allocation policy before live issuance. NexAthleteXchange will not secretly mint additional units above the disclosed maximum supply. Platform, treasury, reserve, customer, and liquidity allocations must be separately identified in the applicable product rules. Orders are subject to price-time priority or other disclosed matching rules.</p>
    <p>Wash trading, self-dealing intended to create false volume, matched manipulation, spoofing, collusion, artificial price creation, account sharing, multi-accounting, fraud, unauthorized automation, and attempts to exploit stale data or system defects are prohibited. NexAthleteXchange may cancel orders, halt a market, freeze an account, reverse an erroneous system entry where legally permitted, preserve records, and investigate suspected abuse.</p>

    <h2>5. Identity, sanctions, location, and financial-crime controls</h2>
    <p>Before live funding, trading, or withdrawal, NexAthleteXchange may require identity verification, age verification, sanctions screening, location verification, wallet screening, source-of-funds information, transaction monitoring, and additional review. Access may be denied, limited, frozen, or reported when required by law, sanctions obligations, payment-provider rules, or risk controls. Sandbox verification is simulated and does not qualify a user for live trading.</p>

    <h2>6. Funding, custody, withdrawals, and fees</h2>
    <p>Live funding and withdrawals, if launched, may use banks, card processors, regulated payment providers, or supported digital-asset providers. Supported rails, settlement times, limits, holds, reversals, and fees will be disclosed before a transaction is submitted. Customer money and company revenue must be separately accounted. A displayed balance is subject to settlement, fraud, chargeback, sanctions, and withdrawal controls.</p>
    <p>USDC or other supported digital assets can involve blockchain, wallet, smart-contract, network, custody, stablecoin, and irreversible-transfer risks. Sending funds to an unsupported network or address may result in permanent loss. NexAthleteXchange may restrict supported assets and networks.</p>

    <h2>7. Fees</h2>
    <p>Current sandbox references to a $2 trading fee are test rules. Any live fee schedule will be shown before order submission and may be changed prospectively with notice. Fees already charged to a completed transaction will not be changed retroactively.</p>

    <h2>8. Athlete events and lifecycle changes</h2>
    <p>Injury, retirement, suspension, death, league exit, team change, provider outage, data correction, or other athlete events may affect research signals, liquidity, or market availability. Such events do not automatically create a cash payout. Any live lifecycle rule will be disclosed before the affected market is offered. NexAthleteXchange will not use another customer's funds to satisfy an undisclosed buyback promise.</p>

    <h2>9. No investment, tax, or betting advice</h2>
    <p>NexAthleteXchange provides a marketplace and sports-research experience, not personalized investment, legal, tax, or betting advice. You are responsible for your decisions, tax reporting, and determining whether your use is lawful where you are located. Past athlete performance or prior collectible prices do not predict future results.</p>

    <h2>10. Intellectual property and athlete references</h2>
    <p>Names, statistics, factual sports information, trademarks, logos, images, and other materials may be owned by their respective rights holders. Purchasing a digital athlete collectible does not transfer publicity, trademark, copyright, endorsement, or licensing rights in an athlete, team, or league.</p>

    <h2>11. Suspension and termination</h2>
    <p>NexAthleteXchange may restrict or terminate access for fraud, manipulation, sanctions concerns, illegal activity, security threats, Terms violations, required legal process, or risk-control reasons. Where permitted and operationally possible, legitimate settled customer value remains subject to the applicable withdrawal and legal process rather than becoming company revenue solely because an account is closed.</p>

    <h2>12. Electronic records and changes to these Terms</h2>
    <p>You consent to receiving these Terms, transaction records, notices, disclosures, and account communications electronically. NexAthleteXchange records the Terms version and acceptance time. Materially revised Terms may require a new affirmative acceptance before continued Real Market use.</p>

    <h2>13. Service risks and limitation of platform promises</h2>
    <p>The service can experience outages, delayed data, provider failures, network congestion, market halts, security events, and software defects. To the maximum extent permitted by applicable law, the service is provided without a promise that it will always be uninterrupted, liquid, profitable, or error-free. Nothing in these Terms waives rights that cannot legally be waived.</p>

    <h2>14. Contact and governing rules</h2>
    <p>Product-specific rules, fee schedules, eligibility notices, privacy disclosures, and risk disclosures are incorporated into these Terms when clearly presented as applicable to a feature. If a product rule conflicts with these general Terms, the more specific rule controls for that feature to the extent permitted by law.</p>

    <p className="muted">Real-money Real Market functionality is not enabled today. These Terms establish the operating rules and acceptance record for the product path; they do not themselves authorize live financial activity in any jurisdiction.</p>
  </article></main>;
}
