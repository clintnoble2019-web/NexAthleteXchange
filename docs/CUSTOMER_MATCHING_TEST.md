# Scouting Economy — Customer Matching Test

Status: implemented for review; fake-money testing only.
Branch: `real-market-customer-matching`, based on the unmerged Foundation 4 branch.
Entry: `/real-market/test`.

## What works

Verified test customers can add fake cash, claim 10 fake shares per athlete once, submit funded limit orders, match with another customer, see partial fills, cancel unfilled quantities, and test withdrawing available cash. The screen shows aggregate depth, order status, settled cash versus holds, reference holdings value, fills, fees, and ledger history.

The first-stage engine does not create an automatic counterparty. Best price has priority; at an equal price, the database order sequence determines priority. Incoming orders trade at the resting order's price. Crossing your own order is rejected. Orders remain until filled, canceled, or removed by account freeze, revoked identity verification, athlete halt, or instrument retirement.

Balances, positions, and audit records use new `Scout*` tables. They cannot be spent or redeemed by the legacy reference-price/LP simulator or the Free Market. The database constraints permit only SANDBOX rows in these tables.

## Funding and fee rules for this test

- Buy: reserve the maximum limit-price notional, rounded upward to cents, plus $2.
- Sell: reserve the owned quantity and $2 of existing available test cash. This upfront sell-fee requirement avoids borrowing against hypothetical proceeds on a tiny first partial fill.
- Charge exactly $2 per customer order on its first nonzero fill. Subsequent fills of that same order charge no additional fee.
- No fill means no execution fee. Canceling a partial order keeps completed fills and its already charged fee.
- New orders must have at least $2.01 notional and at most $1,000,000. Price and quantity use a 0.01 tick. A matched partial fill can be smaller than the new-order minimum.
- Each matched gross amount rounds downward to whole cents; a sub-cent fill does not execute. Price improvement, rounding surplus, and unused fee reservations are released as holds are recalculated. Tiny leftovers may need cancellation. Both sides use the same settled gross, so cash is conserved.
- Fake cash balance is capped at $1,000,000. It is not a real deposit or withdrawable value.
- A one-time fake share grant has zero test cost basis. This is not the live supply or issuance policy.

Order entry, cash requests, and allocations are replay protected. All wallet, position, order, fill, and ledger changes for an execution occur in one serializable transaction, with bounded conflict retries. The test rejects an order that would require processing over 100 resting counterparties in one transaction. Each account may have at most 100 open orders.

## Prepare an isolated database

Do not point this test environment at the production database. Prefer a separate Neon branch and a new empty database on that branch, with a dedicated role. Seeded fixtures must not contain copied production customer accounts or sessions.

For an empty test database:

```bash
npm ci
npm run db:generate
npx prisma db push
npx prisma db execute --file prisma/releases/customer-matching-checks.sql --schema prisma/schema.prisma
npm run db:seed
```

For a database already at the Foundation 4 schema, apply `prisma/releases/customer-matching.sql` once, then `customer-matching-checks.sql`. The additive SQL creates only the customer matching tables and enum; the checks enforce nonnegative backing, valid quantities and fees, and the sandbox boundary. It does not rewrite existing balances or trade history.

## Test environment configuration

| Variable | Test setting |
| --- | --- |
| `DATABASE_URL` | Isolated customer test database connection |
| `APP_ORIGIN` | Exact test service origin, without trailing slash |
| `REAL_MARKET_SANDBOX_PREVIEW` | `1` |
| `REAL_MARKET_CUSTOMER_TEST` | `1` |
| `ADMIN_USER_IDS` | `scout-test-admin` for the bootstrap administrator |
| `SCOUT_TEST_DATABASE` | `1`, only for the isolated test database |
| `SCOUT_TEST_PASSWORD` | Secret test password, at least 12 characters |
| `SESSION_COOKIE_NAME` | A distinct test cookie name for deployment |
| `TRUST_PROXY_IP` | `0` unless the proxy's IP-header handling is verified |

Leave email, banking, custody, roster-sync, and real-money credentials unconfigured for this test. `liveFundsEnabled` remains hard-coded false. The customer-test gate is separate from the existing preview gate and defaults off. The test page asks search engines not to index it.

Run `npm run scout:setup` once after seeding. It creates three distinct synthetic identities and test-only accounts:

- `scout_admin` — administrator (`scout-test-admin`).
- `scout_buyer` — customer with a fill and a resting bid.
- `scout_seller` — customer with a partial sell and remaining ask.

All use the supplied test password, fake funding, and fake inventory. No email is sent, and no live identity is verified. The setup adds three explicitly named Sandbox NFL fixtures alongside the NBA/MLB seed athletes. It retains completed fixtures on a repeat run rather than refilling cash or resetting orders.

Start locally with `npm run dev`, or build and run `npm run build` / `npm start`. On Render use a separate free web service on this branch and the isolated database. Build with `npm ci && npm run db:generate && npm run build`; start with `npm start -- --hostname 0.0.0.0` (Render supplies PORT). Use `npm run scout:bootstrap` as a one-time initialization step before inviting testers. It skips seeding and setup once all demo fixtures exist, preserving order and account state on later builds. Production service and database remain untouched.

## Two-browser walkthrough

1. Sign in as `scout_seller` in one browser and `scout_buyer` in an incognito window using the test password. Open Test Market in both.
2. Choose the bootstrap athlete. Both already have fake cash and shares. The buyer can match the remaining ask at its price; refresh the seller's book to see the fill.
3. On another athlete, claim the fake allocation and place a sell at a chosen price. In the other browser, place a buy at that price or higher.
4. Inspect both cash balances, quantities, fill prices, first-fill fees, and ledger entries.
5. Place a buy below available asks. It should wait with a cash hold. A withdrawal exceeding available cash should fail. Cancel its remainder, then retry the fake withdrawal.
6. Place a larger order and fill it in parts from the other account. Confirm only one $2 fee for each order, then cancel the remainder.
7. Sign in as the test administrator to approve newly registered synthetic testers. Identity verification begins immediately after Real Market signup; use opaque fake person IDs, never real documents.

## Validation

`npm run test:customermatching` requires `FOUNDATION4_TEST_DATABASE=1` on an isolated acceptance database. It covers price/time priority, partials, fee-once policy, cash/share holds, ownership, withdrawal restrictions, replay and concurrent replay, competing buyers, competing commitments, cancellation races, rounding, freezes, pauses, halts, retirement cancellation, verification revocation, HTTP controls, and cash/share conservation.

Customer Matching CI runs PostgreSQL 17, all prior eight suites, customer matching acceptance, bootstrap fixtures, and desktop/mobile screenshots including the customer test screen. Local embedded Postgres checks supplement that run; actual PostgreSQL CI validates concurrency.

## Remaining live launch work

Testing this matching engine is not real-money activation. Live customer custody and reconciled deposits/withdrawals, production KYC/AML and eligibility, approved issuance/supply, legal structure, lifecycle/redemption terms and funded obligations, operating surveillance, and launch approval remain separate work. Public Real Market remains Coming Soon.
