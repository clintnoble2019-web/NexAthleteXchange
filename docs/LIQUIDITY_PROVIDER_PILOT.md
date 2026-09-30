# NexAthleteXchange — Liquidity Provider Pilot Mandate

Status: Draft commercial/technical mandate for sandbox discussions

## Market

NexAthleteXchange is building a performance-priced marketplace for persistent NBA, NFL, and MLB athlete positions. The performance engine supplies a reference price; professional liquidity providers maintain executable two-sided quotes around that reference.

## Initial mandate

- 60 athlete instruments total
- NBA: 20
- NFL: 20, restricted to QB / WR / RB at launch
- MLB: 20 across major position types
- Settlement unit: USD-equivalent
- Planned crypto settlement: USDC on Solana
- Retail execution fee: $2.00 per executed buy or sell
- LP maker fee target: $0.00
- Pilot term target: 60-90 days

Exact production athlete names, spread, depth, capital commitment, quote uptime, and operating hours remain subject to final commercial agreement.

## Expected LP responsibilities

The LP should be able to:

- maintain continuous BID and ASK quotes for assigned instruments
- refresh quotes before TTL expiry
- consume NexAthlete reference prices and instrument states
- respect per-athlete and gross-exposure limits
- maintain adequate cash for bid commitments
- maintain adequate inventory/approved inventory facility for ask commitments
- cancel quotes immediately on instrument halt or retirement notice
- reconcile fills, inventory, and cash with NexAthleteXchange
- provide operational contact/escalation coverage for the agreed market hours

## NexAthleteXchange responsibilities

NexAthleteXchange should provide:

- stable authenticated institutional API
- sandbox credentials before production onboarding
- instrument/reference-price feed
- quote submit/cancel/replace endpoints
- heartbeat and account endpoints
- deterministic fill records
- inventory and cash reconciliation
- platform kill switches
- instrument halt controls
- documented athlete lifecycle policy
- platform-funded career-ending retirement settlement reserve
- retail fee collection independent of LP maker economics

## Sandbox API contract

Foundation 3 exposes sandbox-only LP endpoints behind the internal sandbox gate:

- `GET /api/real-market/lp/instruments`
- `GET /api/real-market/lp/market-data`
- `GET /api/real-market/lp/account`
- `POST /api/real-market/lp/heartbeat`
- `POST /api/real-market/lp/quotes`
- `DELETE /api/real-market/lp/quotes`

Authentication uses a bearer API key stored server-side only as a SHA-256 hash. Keys may include exact-IP allowlists. Raw keys are returned only once at provisioning time.

## Risk controls in Foundation 3

Each sandbox LP account includes configurable:

- maximum quote/reference deviation in basis points
- minimum quote depth
- maximum gross quoted exposure
- maximum per-athlete quoted exposure
- quote TTL
- account suspension
- cancel-all control
- exact-IP allowlisting
- heartbeat timestamp

Each instrument includes:

- ACTIVE / HALTED / RETIRING / SETTLED / RETIRED lifecycle state
- reference price
- frozen retirement settlement price when applicable
- retirement deadline
- retirement reason

## Career-ending event economics

Career-ending retirement is not an LP loss-transfer mechanism. On confirmed retirement:

- quotes are cancelled
- the reference value freezes
- holders receive a seven-day exit period
- compulsory residual redemption is paid from the platform settlement reserve
- the LP is not required to absorb all residual customer positions at the frozen value

## Capital structures to request from prospective LPs

NexAthleteXchange can request proposals for any of the following rather than assuming one model:

1. LP balance-sheet capital and inventory.
2. NexAthlete-funded capital with LP execution/technology.
3. Credit or inventory facility.
4. Hybrid shared-capital mandate.

Each proposal should separately quote:

- committed capital
- available displayed depth
- target spread
- minimum uptime
- retainer, if any
- spread participation
- rebates/incentives
- collateral requirements
- custody requirements
- integration cost
- termination terms

## Evaluation scorecard

NexAthleteXchange should compare providers on:

- capital commitment
- executable depth
- spread quality
- quote uptime
- ability to support 60 instruments
- API/integration readiness
- Solana/USDC capability
- reporting and reconciliation
- operational support
- risk controls
- commercial cost
- counterparty/compliance requirements

The initial objective is not to select the cheapest provider. It is to find a provider whose capital, technology, risk controls, and commercial structure can support a stable 60-instrument launch.

## LIVE boundary

This mandate describes the sandbox and intended commercial model. It does not activate LIVE money movement. Production use remains blocked by the hard live-funds gate and separate launch requirements.
