# Real Market — The Scouting Economy

Status: planned launch model and public positioning, September 30, 2026
Implementation: public copy updated; customer order matching is implemented only in the separate fake-money test market
Live funds: disabled

## Product story

**A market built on scouting conviction.**

Spot opportunity. Build your position. Trade with another scout.

The planned Real Market connects funded buyers and sellers of athlete-linked positions across NBA, NFL, and MLB. Research and real-world performance inform each scout's decisions. Executions require matching orders and available backing.

Public language should describe scouts, athlete positions, funded orders, research, and market depth. It must not imply ownership of athletes, teams, company equity, or athlete earnings. Final legal classification and eligible locations remain launch decisions. Describe the product as coming soon; no live enrollment, real deposits, real trades, or withdrawals are available today.

## First stage: orders between scouts

- A buy order reserves the buyer's settled, available cash plus applicable fees.
- A sell order reserves positions the seller actually owns; the planned model does not allow unsupported short selling.
- Matching transfers cash and positions between traders atomically, with an immutable execution and ledger trail.
- The same cash or position cannot back multiple commitments simultaneously.
- Uncommitted cash belongs to its customer. It is not automatically a standing buy order, company income, or a company liquidity reserve.
- When a trade completes, proceeds belong to the seller, who may place another order or request withdrawal subject to the finalized settlement and withdrawal rules.
- An order may wait, fill partially, or remain unfilled. Customers must be able to cancel the unfilled quantity and release its backing.
- Selling requires a funded counterparty at an acceptable price and quantity. No instant sale, guaranteed profit, or universal buyer coverage is promised.

Customer matching allows a launch model without a company-funded market-making book. It does not eliminate operating, payment, custody, compliance, or settlement costs.

## Reference price and execution price

The performance engine continues to supply athlete research and a reference value. Customer activity does not directly change that performance reference.

Execution price is distinct: it comes from matching funded buy and sell interest within the eventual venue rules. Reference value and reference portfolio value are research valuations, not redeemable cash or guaranteed sale proceeds. Production price bands, tick sizes, matching priority, stale-data controls, and market-halt behavior must be finalized and implemented.

## Free Market and Real Market

| Behavior | Free Market today | Planned Real Market |
| --- | --- | --- |
| Balance | NexPoints with no real-money value | Separate USD/USDC customer balance |
| Execution | Simulated fills at performance-driven prices | Funded buyer and seller must match |
| Performance data | Sets virtual game prices | Informs scouting and reference valuation |
| Sale availability | Virtual simulator | Depends on funded orders and available depth |
| Withdrawals | None | Available settled cash via bank or USDC on Solana |

The scouting experience can be shared, but the balances, positions, execution rules, and risk disclosures must remain separate.

## Fees and retained company earnings

The planned retail fee remains $2 per executed buy or sell, recorded separately from trade notional. Fee treatment for partial executions must be finalized before launch so splitting an order does not unexpectedly multiply charges.

Count revenue from actual customer-side fee charges, not deposit amounts or matched notional. For example, 1,000 fee charges at $2 produce $2,000 gross platform revenue before costs. A matched transaction has two customer sides; fee accounting must explicitly identify each charged side.

The owner's intended retention policy is:

1. Pay operating obligations and make appropriate tax provisions.
2. Satisfy minimum cash and payout reserve requirements before any owner distribution.
3. Retain 90% of the remaining distributable earnings supported by available cash for company reserves, development, and future liquidity.
4. Allow at most 10% for owner distributions, and suspend distributions whenever reserve coverage is inadequate.

This is an operating policy, not an automated treasury feature or a guarantee of adequate capitalization. Retained earnings are not automatically cash: reserve reports must reconcile actual available company funds. Customer balances remain separate from company revenue, reserves, and distributions.

## Later stage: evaluate professional liquidity

Capture actual executed volume, active funded traders, spread, depth by athlete and price, order-fill time, partial/unfilled rates, concentration, and withdrawal demand. Distinguish genuine third-party activity from self-trading or artificial volume.

Use this evidence to evaluate professional liquidity providers after market demand is established. A later provider may post its own cash-backed bids and inventory-backed asks, subject to agreed limits. A signed relationship, committed capital, pricing mandate, and operating readiness are separate decisions; activity alone does not guarantee a provider will join or that every position can be sold.

Existing Foundation 3 LP accounts, quotes, exposure controls, and APIs remain useful sandbox prototypes for this possible later stage. They are not a required external provider for the first-stage plan.

## Retirement and redemption

The older sandbox implements reference-price retirement cashouts and a seven-day compulsory reserve-funded settlement. Those are simulator behaviors, not approved promises for this launch model.

Before live activation, define the handling of retirement, permanent injury, death, data loss, and ordinary inactivity. Any promised redemption must have explicitly funded coverage; future fee revenue or customer cash belonging to other traders is not sufficient backing. Without such coverage, the product must not promise a buyback at its reference value.

## Implementation and launch gaps

The customer order book is now implemented at `/real-market/test` with separate fake-money balances, holdings, orders, fills, and ledgers. See [Customer Matching Test](CUSTOMER_MATCHING_TEST.md) for setup and current rules. Legacy simulator accounting remains separate. The customer sandbox still executes artificial reference-price trades, and the LP sandbox still executes artificial provider quotes. Their UI labels identify those limits.

Before a live scout-to-scout market can launch, implement and review:

- Initial position issuance, supply, allocation, and pricing rules. An order book cannot begin selling positions without a defined source of valid inventory.
- Customer order records, backing holds, cancellation, matching priority, partial fills, fee policy, replay protection, concurrent execution, and settlement reconciliation.
- Separate reference, executable bid/ask, last-trade, and cash valuations in the market and portfolio UI.
- Depth and order-status displays, halt controls, surveillance, and volume/depth reports for future providers.
- Final lifecycle/redemption terms and monitored, independently funded coverage for any payout obligations.
- Production KYC beginning immediately after Real Market signup, one account per verified person, legal/age/location eligibility, custody, funding, withdrawals, and operating controls.

Keep `liveFundsEnabled` hard-coded false while these gaps remain. Public coming-soon language describes the direction without claiming trading is available or that changing the matching model resolves legal eligibility.
