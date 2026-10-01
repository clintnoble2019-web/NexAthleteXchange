import Link from "next/link";

export const metadata = { title: "Real Market Risk Disclosure | NexAthleteXchange" };

export default function RiskDisclosurePage() {
  return <main className="shell"><article className="card" style={{maxWidth: 920, margin: "32px auto", padding: 28}}>
    <h1>Real Market Risk Disclosure</h1>
    <p>This disclosure supplements the <Link href="/terms">Terms of Service</Link>. Real-money Real Market functionality is currently disabled.</p>

    <h2>Collectible and liquidity risk</h2>
    <p>Digital athlete collectibles can lose value or become difficult or impossible to sell. A quoted Scout Value or reference value is research information, not cash value. Actual market value depends on bids, asks, completed trades, available depth, and willing counterparties.</p>

    <h2>Athlete-event risk</h2>
    <p>Performance, injury, retirement, suspension, team changes, league changes, public controversy, data corrections, and other events can materially affect interest in an athlete collectible. These events do not automatically create a cash payout or guaranteed platform repurchase.</p>

    <h2>Market-structure risk</h2>
    <p>Orders may fill partially or not at all. Larger orders can experience price impact. Market makers or platform-held inventory, if used, can create concentration and conflict risks. Applicable inventory allocations and market-making rules must be disclosed before live use.</p>

    <h2>Technology and data risk</h2>
    <p>Sports-data feeds, pricing research, internet services, databases, payment providers, identity providers, blockchains, and wallets may experience outages, delays, corrections, or security events. NexAthleteXchange may halt trading when data integrity or market integrity is uncertain.</p>

    <h2>Crypto and stablecoin risk</h2>
    <p>USDC and blockchain transfers can involve custody, issuer, depegging, smart-contract, wallet, network, irreversible-transfer, and sanctions-screening risks. Support for a blockchain or asset may change. Only supported assets, networks, and destination addresses should be used.</p>

    <h2>Regulatory and eligibility risk</h2>
    <p>Availability can differ by jurisdiction and can change. Identity, age, sanctions, geolocation, payment, tax, or other requirements may prevent or limit funding, trading, or withdrawal. A sandbox account, Terms acceptance, or account balance does not itself establish live eligibility.</p>

    <h2>Loss risk</h2>
    <p>Do not use money you cannot afford to lose. No athlete collectible is guaranteed to appreciate, maintain a minimum price, or have a buyer when you want to sell.</p>
  </article></main>;
}
