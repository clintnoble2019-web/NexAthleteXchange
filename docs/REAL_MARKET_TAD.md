# NexAthleteXchange Real Market — Technical Architecture Document

Status: Foundation architecture
Environment: Sandbox only
Live funds: Disabled

Current launch direction: [The Scouting Economy](REAL_MARKET_LAUNCH_MODEL.md). First-stage trading is planned to match funded customer orders, with professional liquidity considered later. This document describes the existing simulator foundation; customer order matching is implemented only in the separate fake-money test market. Its reference-price fills and retirement redemptions are not live product promises.

## 1. Product boundary

The Real Market is a separate money layer beside the existing NexPoints Free Market. It reuses the same athlete catalog and performance-driven reference prices, but it must never share balances, positions, trades, or ledger entries with the Free Market.

The first implementation is deliberately sandbox-only. It can model deposits, withdrawals, $2 trade fees, athlete positions, and USDC-on-Solana settlement concepts without accepting, transmitting, custodying, or withdrawing real customer funds.

## 2. Core invariants

1. Free Market and Real Market balances are separate.
2. Free Market and Real Market positions are separate.
3. Every Real Market record is tagged with an environment (`SANDBOX` or `LIVE`).
4. Current code may create only `SANDBOX` records.
5. `liveFundsEnabled` remains hard-coded `false` until a future launch change is deliberately reviewed.
6. Real Market trades do not directly change athlete reference prices. Reference values continue to come from the performance engine; future customer execution prices come from matching orders.
7. Every completed cash movement produces an immutable ledger record.
8. Every executed Real Market trade records the flat platform fee independently from gross trade value.
9. Debit cards are a planned deposit rail only. Withdrawals are limited to bank or USDC on Solana.
10. No private keys, seed phrases, payment-card data, bank credentials, or KYC documents are stored by this foundation.

## 3. Planned customer money model

### Deposits

- Bank
- Debit card
- USDC on Solana

### Trading unit

Athlete positions are priced in USD-equivalent terms. USDC is the planned crypto settlement asset so SOL volatility does not alter athlete prices.

### Trade fee

- $2.00 per executed buy
- $2.00 per executed sell
- Fee is recorded separately from trade notional

### Withdrawals

- Bank
- USDC on Solana
- No debit-card withdrawals

## 4. Sandbox architecture

The sandbox models the future Real Market using fake USD/USDC balances only.

### RealWallet

One wallet per user per environment.

Fields:
- user
- environment
- currency
- balance
- updated timestamp

### RealPosition

Persistent athlete holdings, separate from Free Market `Position` records.

Fields:
- user
- athlete
- environment
- quantity
- all-in average cost
- updated timestamp

The sandbox includes buy fees in average cost so realized P/L reflects the economic cost of entering a position.

### RealTrade

Immutable execution record.

Fields:
- side
- quantity
- execution price
- gross value
- fee
- signed net cash flow
- realized P/L
- environment
- timestamp

### RealLedgerEntry

Immutable wallet audit trail.

Ledger events include:
- sandbox deposit
- sandbox withdrawal
- trade buy
- trade sell
- trade fee

Each record stores the post-entry wallet balance.

### RealFundingTransaction

Models deposit and withdrawal lifecycle independently from ledger settlement.

Fields:
- deposit/withdrawal type
- rail
- status: `PENDING`, `COMPLETED`, or `FAILED`
- amount
- asset/currency
- network
- provider/reference id
- external address when relevant
- failure reason when relevant
- environment
- timestamps

Only a completed funding transaction changes the wallet balance and creates a ledger entry.

## 5. Solana development model

Foundation 2 uses a Solana Devnet-style funding simulation rather than real USDC movement.

Sandbox records can model:
- network: Solana Devnet
- asset: USDC
- mock transaction signature/reference
- destination wallet address for simulated withdrawals

A later integration can replace the simulator with a wallet/custody/on-ramp provider behind the same funding interface. Live mainnet code must not be activated merely by changing an environment variable; it requires an explicit code change to the live-funds guard.

## 6. Trade accounting

### Buy

The existing reference-price simulator uses athlete reference price `P`, quantity `Q`, and flat fee `F = $2`. Future customer matching uses the actual execution price and requires a funded counterparty; a reference quote alone cannot execute a live trade.

- gross = `P × Q`
- cash debit = `gross + F`
- all-in average cost includes the fee

A buy fails when the sandbox wallet cannot cover gross plus fee.

### Sell

- gross = `P × Q`
- cash credit = `gross - F`
- realized P/L = net sale proceeds minus the all-in cost basis of the quantity sold

A sell fails if the user lacks quantity or if the trade gross is not greater than the flat fee.

## 7. Funding state machine

Every request begins as `PENDING`.

Allowed terminal transitions:

- `PENDING -> COMPLETED`
- `PENDING -> FAILED`

Completed deposits credit the wallet.
Completed withdrawals debit the wallet.
Failed transactions never change wallet balance.

The initial simulator completes valid requests immediately but still writes the state transition through the same service layer that a future asynchronous provider webhook can use.

## 8. Public exposure

`/real-market` remains the only public Real Market destination and shows `COMING SOON`.

The interactive sandbox lives at `/real-market/sandbox` and is hidden by default. It requires:

- an authenticated user, and
- `REAL_MARKET_SANDBOX_PREVIEW=1` (or local development mode)

There is no public navigation link to the sandbox.

## 9. Future provider boundaries

The following are intentionally interfaces/placeholders, not live integrations in Foundation 2:

- fiat on-ramp / bank provider
- card funding provider
- bank withdrawal provider
- identity/KYC provider
- sanctions/AML screening provider
- Solana custody or wallet infrastructure
- USDC mainnet settlement
- liquidity provider / market maker connectivity

Provider-specific secrets must stay server-side and must never be committed to the repository.

## 10. Launch gates for a future LIVE environment

Before any LIVE record or real customer money is enabled, the product should have all of the following implemented and approved for launch:

- final legal/compliance operating structure
- identity and age checks as required
- jurisdiction/geofence rules as required
- sanctions/AML controls as required
- approved fiat payment and withdrawal rails
- approved crypto custody/wallet model
- production key management
- deposit/withdrawal reconciliation
- transaction monitoring and audit exports
- fraud and chargeback controls
- funded customer order matching, backing holds, and exposure limits; provider agreements and controls if professional liquidity is added later
- finalized initial position issuance and retirement/redemption rules with funded coverage for any promised payouts
- incident response and account freeze tooling
- customer disclosures and terms
- production monitoring and alerting

## 11. Foundation 2 acceptance criteria

Foundation 2 is complete when:

1. A sandbox user can receive a fake bank/card/USDC deposit.
2. Funding transactions support pending/completed/failed states.
3. A sandbox wallet is distinct from the NexPoints wallet.
4. A sandbox user can buy an athlete with fake dollars and pay a $2 fee.
5. A sandbox user can sell an athlete and pay a $2 fee.
6. Sandbox positions are separate from Free Market positions.
7. Bank and USDC sandbox withdrawals work; debit-card withdrawal is rejected.
8. Failed withdrawals do not change the wallet balance.
9. Ledger balances reconcile to the sandbox wallet.
10. Existing Milestone 1–5 tests continue to pass.
11. No route can move real funds.
