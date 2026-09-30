# Provider Funding Separation

Provider-backed Solana Devnet USDC is intentionally isolated from the fake customer-matching cash ledger.

- `ScoutWallet.balance` is simulated market cash and has no withdrawal value.
- Circle Devnet USDC deposits are tracked only through `RealFundingTransaction` records.
- Circle Devnet USDC withdrawals are limited to net provider-funded Devnet USDC: completed provider deposits minus completed and pending provider withdrawals.
- Fake test cash, test trading gains, and open-order balances cannot be redeemed or converted to USDC.
- A verified legacy/sandbox enrollment is not sufficient for provider funding. Provider funding requires an approved Persona-backed enrollment (`providerRef` begins with `persona:`) plus current Terms acceptance.
- If Persona is not configured, provider funding stays blocked rather than falling back to administrator-reviewed sandbox verification.
- Mainnet remains disabled.
