# Real Market Foundation 3 — Institutional Liquidity Infrastructure

Status: Sandbox only
Live funds: Disabled

## Objective

Foundation 3 turns the Real Market sandbox from a customer-money simulator into a venue that a professional liquidity provider can technically evaluate.

## Implemented

### 60-instrument launch mandate

- 20 NBA
- 20 NFL (QB / WR / RB only)
- 20 MLB
- 60 total

The sandbox universe filler keeps each sport at a target of 20 eligible non-retired instruments when enough eligible athletes exist. Production athlete selection remains a manual business decision.

### Instrument lifecycle

Each Real Market instrument tracks:

- reference price
- ACTIVE / HALTED / RETIRING / SETTLED / RETIRED status
- frozen retirement settlement price
- seven-day retirement deadline
- retirement reason
- launch rank

### Career-ending retirement

A verified career-ending event:

1. cancels LP quotes,
2. changes the instrument to RETIRING,
3. freezes the current valid reference price,
4. starts a seven-day deadline,
5. automatically redeems remaining sandbox positions after the deadline from the settlement reserve,
6. retires the instrument,
7. adds the next eligible athlete when available.

Automatic sandbox retirement settlement is fee-free and is paid by the platform settlement reserve rather than the LP.

### Liquidity-provider accounts

Sandbox LP records support:

- zero maker fee target
- cash wallet
- per-instrument inventory
- max spread/reference deviation in bps
- minimum quote depth
- max gross quoted exposure
- max per-athlete quoted exposure
- quote TTL
- heartbeat timestamp
- account suspension
- cancel-all kill switch

### API authentication

LP credentials use bearer API keys. The plaintext key is returned only once during provisioning. The database stores only SHA-256 hashes plus a visible key prefix. Optional exact-IP allowlists are enforced by the sandbox authentication layer.

### Quote engine

LPs can submit and replace one active BID and one active ASK per instrument. Quote validation checks:

- instrument ACTIVE status
- quote/reference direction
- maximum bps deviation
- minimum notional depth
- provider gross exposure
- per-athlete exposure
- cash backing for BID commitments
- inventory backing for ASK commitments
- quote expiration

Expired quotes are marked EXPIRED. Quotes can be cancelled individually or all at once.

### LP-backed sandbox execution

The sandbox execution engine can match a customer BUY to the best ASK and a customer SELL to the best BID. It updates atomically:

- customer wallet
- customer Real Market position
- $2 retail fee ledger
- RealTrade execution
- LP cash wallet
- LP athlete inventory
- quote remaining quantity/status
- LiquidityFill audit record

LP maker fee remains zero in this sandbox model.

### Settlement reserve

A separate sandbox reserve funds compulsory career-ending redemptions. The retirement settlement fails closed if the reserve is underfunded.

### Internal console

`/real-market/liquidity` is hidden behind the existing sandbox-preview gate and authentication. It displays:

- 60-instrument coverage
- LP accounts
- LP cash
- active quote count
- quote coverage
- reference prices
- instrument state
- settlement reserve balance
- retirement settlement history

### Institutional sandbox API

All routes remain behind the sandbox-preview gate:

- `GET /api/real-market/lp/instruments`
- `GET /api/real-market/lp/market-data`
- `GET /api/real-market/lp/account`
- `POST /api/real-market/lp/heartbeat`
- `POST /api/real-market/lp/quotes`
- `DELETE /api/real-market/lp/quotes`

`DELETE /quotes` accepts `{ "all": true }` as the LP-side cancel-all kill switch.

### Provisioning

`npm run lp:provision:sandbox`

Required environment variables:

- `LP_CODE`
- `LP_NAME`

Optional:

- `LP_INITIAL_CASH`
- `LP_INVENTORY_PER_INSTRUMENT`
- `LP_IP_ALLOWLIST` (comma-separated exact IPs)
- `LP_MAX_SPREAD_BPS`
- `LP_MIN_QUOTE_DEPTH`
- `LP_MAX_GROSS_EXPOSURE`
- `LP_MAX_PER_ATHLETE_EXPOSURE`
- `LP_QUOTE_TTL_SECONDS`

## Intentionally not implemented as LIVE infrastructure

- production mainnet USDC movement
- production fiat/custody provider
- production KYC/AML provider
- production legal jurisdiction rules
- production FIX connectivity
- production WebSocket market-data service
- production LP capital/collateral agreement
- production migration of Foundation 3 tables

These are subsequent launch gates. Foundation 3 only creates a technically reviewable institutional sandbox.
