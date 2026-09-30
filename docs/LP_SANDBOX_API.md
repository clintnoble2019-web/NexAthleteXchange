# NexAthleteXchange Liquidity Provider Sandbox API

Status: Internal sandbox
Base path: `/api/real-market/lp`
Authentication: `Authorization: Bearer <sandbox-api-key>`
Live funds: Disabled

All endpoints return 404 unless the internal Real Market sandbox preview is enabled. API keys are provisioned server-side and stored only as SHA-256 hashes. If a key has an IP allowlist, the request source IP must match exactly.

## GET /instruments

Returns the sandbox Real Market instrument universe, athlete metadata, status, reference price, frozen settlement price, and retirement deadline.

## GET /market-data

Returns a snapshot of every sandbox Real Market instrument with:

- reference price
- instrument state
- best bid
- best ask
- remaining bid/ask size
- quote provider code
- quote expiry
- frozen settlement information when retiring

This JSON snapshot is the Foundation 3 market-data interface. Production streaming/WebSocket connectivity is a later institutional integration.

## GET /account

Returns the authenticated LP's:

- status
- maker fee
- quote limits
- cash wallet
- inventory
- active quotes
- estimated inventory reference value
- quoted notional
- last heartbeat

## POST /heartbeat

No request body required.

Updates the LP account heartbeat timestamp. Future monitoring can use this value to trigger stale-counterparty alerts and quote cancellation.

## POST /quotes

Example request:

```json
{
  "instrumentId": "instrument-id",
  "side": "BID",
  "price": "19.80",
  "quantity": "25.00"
}
```

Allowed sides:

- `BID`
- `ASK`

Validation includes:

- active sandbox provider
- active instrument
- positive price/quantity
- BID at or below reference price
- ASK at or above reference price
- max bps deviation
- minimum quote notional
- gross exposure limit
- per-athlete exposure limit
- cash backing for bids
- inventory backing for asks

Submitting another quote for the same provider/instrument/side replaces the current sandbox quote.

## DELETE /quotes

Cancel one side:

```json
{
  "instrumentId": "instrument-id",
  "side": "ASK"
}
```

Cancel all provider quotes:

```json
{
  "all": true
}
```

The cancel-all request is the LP-side sandbox kill switch.

## Customer execution

Foundation 3 includes a sandbox matching service that can execute customer buys against the best ASK and customer sells against the best BID. An LP-backed execution atomically updates:

- LP cash
- LP inventory
- quote remaining quantity
- LP fill record
- customer cash
- customer position
- customer RealTrade
- customer $2 fee ledger

The LP maker fee target remains $0.

## Retirement behavior

When an instrument enters RETIRING:

- all LP quotes are cancelled
- new LP quotes are rejected
- the frozen settlement price replaces normal liquidity-provider execution for retirement cashout
- retirement redemptions are funded by the NexAthleteXchange settlement reserve

This protects the LP from forced redemption liability after a verified career-ending event.
