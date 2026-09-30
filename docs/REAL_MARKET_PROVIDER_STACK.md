# Real Market provider stack

This document describes the provider-backed **testnet** identity and USDC funding path. It is not a legal determination that the Real Market may operate in a jurisdiction. `realMarket.liveFundsEnabled` remains `false`, and the Circle adapter refuses any blockchain other than `SOL-DEVNET`.

## Persona identity and eligibility

NexAthleteXchange pre-creates Persona Inquiries on the server and sends the logged-in user to Persona Hosted Flow. Use one Persona reference ID per Nex user ID. Do not use email, SSN, document number, or another sensitive identifier as the reference ID.

Configure a Persona **Sandbox Dynamic Flow** before enabling the provider path. The template's decisioning must only issue an approved Inquiry after the operator-required checks pass. At minimum for this product path that means identity/KYC, an 18+ age rule, required sanctions/watchlist checks, and any operator-required eligibility checks. Persona's inquiry-session location/network signals are evaluated again by NexGame; VPN, proxy, Tor, datacenter, high-threat sessions, or a blocked jurisdiction cause manual review rather than automatic Real Market access.

Required environment values:

- `PERSONA_API_KEY`
- `PERSONA_INQUIRY_TEMPLATE_ID`
- `PERSONA_WEBHOOK_SECRET`
- `PERSONA_API_VERSION=2025-10-27`
- `REAL_MARKET_ALLOWED_REGIONS` before any live jurisdiction is approved

Webhook endpoint:

- `POST /api/webhooks/persona`

The handler verifies the raw request body against `Persona-Signature`, applies a timestamp window, ignores already-processed event IDs, retrieves the authoritative Inquiry from Persona, and records only the decision/control data NexGame needs. Raw identity documents and document numbers are not stored in NexGame.

## Circle Solana Devnet USDC

The current integration uses Circle developer-controlled wallets. It is deliberately testnet-only.

The operator must create the Circle test account, generate and register the Circle entity secret, and retain the recovery material outside the repository. Do not paste the entity secret into source code, issues, pull requests, or chat logs. Store it as a secret environment variable in the deployment platform.

Required test environment values:

- `CIRCLE_API_KEY`
- `CIRCLE_ENTITY_SECRET`
- `CIRCLE_WALLET_SET_ID`
- `CIRCLE_USDC_TOKEN_ID` for the intended Solana Devnet USDC token
- `CIRCLE_BLOCKCHAIN=SOL-DEVNET`
- `CIRCLE_WEBHOOK_ENABLED=1`
- `CIRCLE_COMPLIANCE_SCREENING_ENABLED=1`
- `CIRCLE_SETTLEMENT_WALLET_ID`

Webhook endpoint:

- `POST /api/webhooks/circle`

The handler verifies Circle notification signatures using the Circle public-key endpoint, deduplicates notification IDs, fetches the authoritative transaction, and reconciles terminal states.

### Deposits

Each verified test user can receive a Circle-controlled Solana Devnet deposit address. Only the configured USDC token is considered when NexGame syncs a balance. A new confirmed provider balance delta is posted once to the sandbox customer cash ledger and gets a corresponding funding record and audit event.

The per-user deposit wallets are not swept automatically in this implementation. They are test custody sub-wallets. Before any live use, the operator needs a reviewed custody/reconciliation design, including asset/liability reconciliation and any required sweeps or omnibus controls.

### Withdrawals

Withdrawals are sourced from the configured test settlement wallet because the customer's NexGame cash claim can change through marketplace trades and no longer maps one-for-one to the original deposit wallet.

Before a test withdrawal is submitted:

1. current Terms must be accepted;
2. the Real Market identity must be verified;
3. the account must not be frozen;
4. the destination must pass Circle address screening;
5. the user must have enough available cash after open-order holds;
6. no earlier USDC withdrawal may still be pending;
7. the settlement wallet must have enough Devnet USDC and network gas (unless gas sponsorship is explicitly enabled);
8. the user must explicitly confirm the amount, token, network, and destination.

Cash is reserved while the provider transfer is pending. `COMPLETE` deducts the cash and releases the hold. `FAILED`, `DENIED`, or `CANCELLED` releases the hold without deducting the cash.

## Production launch boundary

Do **not** change the Circle chain to mainnet and do **not** turn on live funds as part of test deployment. A production launch requires, at minimum, a documented jurisdiction allowlist, production KYC/age/sanctions configuration, payment/custody approval, wallet and transaction screening, customer-asset reconciliation, market-surveillance procedures, withdrawal/risk limits, tax/reporting processes, privacy/retention review, incident response, and counsel/provider approval for the final product structure.

The generic readiness environment flags are not substitutes for those controls. Keep them at `0` until each corresponding production control is operational and reviewed.
