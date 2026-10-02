# Foundation 4 — beta operations and account safeguards

Status: implemented for review; production release requires the schema update and configuration below. Real Market remains sandbox-only. No live KYC, payments, custody, or mainnet settlement is enabled.

## Delivered

- Responsive navigation, readable controls, keyboard focus, skip navigation, contained tables, and market/portfolio loading states.
- Recovery screens for page failures and missing routes; database-aware `/api/health` returns 503 when unavailable.
- `/admin` is restricted to explicitly configured user IDs. Ordinary users cannot load the console or invoke its API.
- Account freeze/unfreeze, session revocation, leaderboard eligibility, athlete halt/resume, audited price corrections, market pause/resume, sandbox pause/resume, and LP suspension with quote cancellation.
- Administrative mutations and identity/reward reviews write an audit event in the same transaction as the change. No UI/API can edit audit events.
- Same-origin checks on cookie-authenticated mutations, persistent per-account and authentication rate limits, quantity bounds, and safe return paths.
- Free Market forms carry a server-generated request UUID. Replaying a request returns the recorded trade; reusing its key for another trade is rejected. Wallet, holding, ledger, trade, and request record commit together.
- Password recovery uses hashed, 30-minute, single-use tokens. Resetting a password invalidates every outstanding reset link and session. Account existence is not disclosed by the recovery response.

## Account rules

Multiple Free Market accounts are allowed. There is no device/IP-based one-account rule. Source throttles limit request spam; they do not determine identity.

Real Market sandbox signup goes directly to `/real-market/verify`. Existing Free Market users enter the same enrollment step before accessing the sandbox. A user cannot approve their own verification. Funding, reference-price trades, LP-backed customer executions, and manual retirement cashouts check verification, account status, and pause controls in their service transactions.

An administrator can simulate a KYC result using a consistent opaque sandbox person ID. The database stores only its hash and permits that identity on one account. Revocation retains the identity reservation; it cannot be moved to another account to evade the rule. This is a sandbox test contract, not live KYC. A production provider must supply authenticated, signed results and a stable cross-account person identifier; a session-specific verification ID is insufficient for identity deduplication.

Reward reservations require a verified identity and have database uniqueness constraints on `(campaign, identityHash)` and `(campaign, userId)`. These reservations do not transfer funds, credit wallets, or promise a payout. The original 5,000 NexPoints Free Market bankroll remains available to each valid account; it has no cash value.

Automatic career-ending retirement settlement remains enabled for existing holders even during a customer account freeze. Manual customer cashouts are gated. Free Market balances and Real Market sandbox balances remain separate; the $2 retail fee and bank/USDC-only withdrawal policy are preserved.

## Configuration

- `ADMIN_USER_IDS`: comma-separated existing account IDs. No account gains admin access by signup, username, or email.
- `APP_ORIGIN`: exact canonical browser origin, e.g. `https://nexathletexchange.onrender.com`, without a trailing slash. Used for mutation checks and recovery links.
- `REAL_MARKET_SANDBOX_PREVIEW=1`: explicitly permits sandbox test flows. Leave unset for a Free Market-only production beta.
- `TRUST_PROXY_IP=1`: set only after confirming the host overwrites `x-forwarded-for`. Otherwise source throttling uses a shared higher limit and per-email/per-user throttles still apply. Source IP never grants account ownership.
- `AUTH_EMAIL_WEBHOOK_URL`: HTTPS endpoint of an owned transactional-email adapter.
- `AUTH_EMAIL_WEBHOOK_TOKEN`: server-side credential for that adapter.

The email adapter receives an authenticated POST `{ type: "password_reset", to, resetUrl, expiresInMinutes: 30 }`. Return a successful 2xx only after accepting delivery. The application refuses redirects, uses a 10-second timeout, and invalidates the reset token if delivery fails. Configure the adapter before enabling beta password recovery; missing email configuration does not expose a token or send mail. The admin console reports configuration readiness. Rate counters and reset links are server-side only.

## Release sequence

1. Confirm a database backup/restore point and test against an isolated copy of the current schema.
2. Check the production schema against the existing Foundations 1–3 schema. Foundation 3 was previously documented as not migrated to production; do not assume its tables already exist. Apply any outstanding additive foundation schema separately before enabling its preview.
3. Apply `prisma/releases/foundation-4.sql` once, before releasing this application's new code. This SQL adds two defaulted User columns and the Foundation 4 tables/indexes; it does not drop or rewrite balances, positions, trades, or prices.
4. Configure canonical origin, authorized administrator IDs, and email delivery. Keep sandbox preview off unless intentionally testing it.
5. Deploy the reviewed branch using the existing Render service.
6. Check `/api/health`, account login, a Free Market trade and its ledger, administrator authorization, and the configured email delivery flow. Leave live funds disabled.

This project previously used `prisma db push` rather than a tracked migration history. The release SQL is an explicit additive update, not an invented baseline migration. Apply it with `npx prisma db execute --schema prisma/schema.prisma --file prisma/releases/foundation-4.sql` against the confirmed target only. The SQL is not intended to be rerun after success.

Run `npm run beta:cleanup` daily through existing operations to delete old rate windows, expired sessions, and expired reset tokens. Trade request keys and audit/reward records are retained. No scheduled task is created by this change.

## Verification

`npm run test:foundation4` requires `FOUNDATION4_TEST_DATABASE=1` and an isolated test database, plus the application running with `ADMIN_USER_IDS=foundation4-test-admin` and sandbox preview enabled. It checks:

- Multiple accounts, regular-user admin denial, cross-origin denial, and unsafe return paths.
- Repeated trade requests and changed-payload request-key reuse.
- Mandatory sandbox verification, duplicate identities, revocation, duplicate reward reservations, and the disabled LIVE environment.
- Account freezes, session revocation, global pauses, halted athletes, and leaderboard exclusion.
- Concurrent rate increments, password token hashing/reuse, password change, and session invalidation.
- Admin console access, audit events, and application health.

`Foundation 4 CI` runs on PostgreSQL 17 with all Milestone 1–5 and Real Market Foundation 2–3 regressions, typecheck, and production build. Local embedded PostgreSQL checks are useful, but PostgreSQL CI is the authority for concurrent transaction behavior.

Responsive QA runs at desktop and phone widths across market, portfolio, admin, verification, and athlete screens. Screenshots are attached to the CI run. Local browser installation was unavailable in the execution environment; the CI browser check must pass before release.
