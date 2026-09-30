import Link from "next/link";

export const metadata = { title: "Privacy Notice | NexAthleteXchange" };

export default function PrivacyPage() {
  return <main className="shell"><article className="card" style={{maxWidth: 920, margin: "32px auto", padding: 28}}>
    <h1>Privacy Notice</h1>
    <p className="muted">Effective September 30, 2026</p>
    <p>This notice describes how NexAthleteXchange uses information for account operation, security, the Free Market, and the planned Real Market. It should be read with our <Link href="/terms">Terms of Service</Link>.</p>

    <h2>Information we use</h2>
    <p>We may process account information such as username, email, authentication records, account status, orders, fills, balances, holdings, audit events, support communications, and security metadata. For Real Market eligibility, an approved provider may process identity documents, date of birth, address, sanctions information, and verification signals. NexAthleteXchange is designed to retain a provider reference and a stable hashed identity identifier rather than raw identity-document numbers where practical.</p>

    <h2>How information is used</h2>
    <p>Information is used to provide the service, authenticate users, prevent duplicate Real Market accounts, execute and reconcile orders, maintain audit records, detect fraud and manipulation, apply sanctions and location controls, process payments or withdrawals through approved providers, respond to support requests, secure the platform, comply with lawful requests, and enforce platform rules.</p>

    <h2>Payment, identity, and blockchain providers</h2>
    <p>Live Real Market features may rely on third-party identity, banking, card, custody, blockchain, wallet-screening, or payment providers. Those providers may process information under their own privacy notices and legal obligations. NexAthleteXchange will disclose the applicable providers before live use where required.</p>

    <h2>Public and blockchain information</h2>
    <p>Public profile information may be visible to other users when a feature is designed to be public. If a supported blockchain withdrawal is used, wallet addresses and transaction data may become permanently visible on the public blockchain. Do not use a public wallet address if you do not want its activity publicly associated with that address.</p>

    <h2>Retention and security</h2>
    <p>We retain records for as long as reasonably necessary for account operation, fraud prevention, dispute handling, security, audit, tax, sanctions, payment, and other legal obligations. Security controls can reduce risk but cannot guarantee that a service will never experience unauthorized access.</p>

    <h2>Your choices and rights</h2>
    <p>Depending on where you live, you may have rights to know, access, correct, delete, or obtain information about how personal information is used, and to opt out of certain sale or sharing activities where applicable. NexAthleteXchange does not treat acceptance of the Terms as consent to sell personal information. Requests may be subject to identity verification and lawful retention exceptions.</p>
    <p>California residents may have rights under the CCPA/CPRA, including rights to know, delete, correct, opt out of covered sale or sharing, and receive non-discriminatory treatment for exercising applicable rights.</p>

    <h2>Children</h2>
    <p>NexAthleteXchange is not intended for children under 13. Real Market access requires users to be at least 18 and may require additional age verification before live use.</p>

    <h2>Changes</h2>
    <p>We may update this notice as the product, providers, and legal requirements change. Material changes affecting Real Market data practices may require additional notice or renewed acceptance where appropriate.</p>
  </article></main>;
}
