# NexAthleteXchange Real Market — Digital Athlete Collectible Specification

Status: Sandbox/compliance-hardening design  
Live funds: disabled

## 1. Launch universe

The planned Real Market initially covers up to 60 athlete collectible series:

- NBA: up to 20 active athletes.
- NFL: up to 20 active athletes, initially QB/WR/RB.
- MLB: up to 20 active athletes.

The Free Market remains a separate NexPoints simulation.

## 2. Collectible definition

A Real Market athlete unit is a persistent limited-supply digital collectible associated with one athlete. It is not a one-game proposition and does not automatically expire or cash-settle when a game ends.

A unit does not represent ownership of an athlete, team, league, NexAthleteXchange, athlete salary, endorsement income, company equity, debt, dividends, or intellectual-property rights.

## 3. Scout Value versus market price

NexAthleteXchange's sports-data engine may publish a **Scout Value**. Scout Value is an informational research measure.

It is not:

- a guaranteed sale price;
- a redemption price;
- a cash entitlement;
- a promise of profit; or
- a mandatory price at which the platform will transact.

The executable market price is determined by bids, asks, completed trades, and available order-book depth.

## 4. Supply

Each live athlete series must publish a maximum supply before issuance. The current sandbox uses 100,000 units per athlete to test market behavior. Sandbox allocation is not automatically the final production allocation.

Any production allocation must identify customer/public inventory, platform or treasury inventory, reserve inventory, and liquidity-provider inventory, if any. Additional minting above the disclosed maximum supply is prohibited unless a pre-disclosed product rule expressly permits it and the user-facing supply disclosure is updated before issuance.

## 5. Trading

- Buys require sufficient settled available cash plus applicable fees.
- Sells require units the seller actually owns plus any applicable fee backing.
- Unsupported short selling is prohibited.
- Orders use disclosed matching rules and may be open, partial, filled, or canceled.
- No instant exit or universal buyer coverage is promised.
- Self-trading and manipulative activity are prohibited.

## 6. Instrument states

Existing technical states remain available for operational control:

- ACTIVE — normal trading.
- HALTED — trading paused for data, security, market-integrity, eligibility, or operational reasons.
- RETIRING — temporary lifecycle-review state when an athlete event requires a policy decision.
- SETTLED — reserved for a specifically disclosed settlement process if one exists.
- RETIRED — removed from active trading under the applicable lifecycle policy.

These state names do not themselves create a payout right.

## 7. Athlete lifecycle events

Career-ending injury, ordinary retirement, suspension, release, free agency, league exit, prolonged inactivity, data loss, death, team changes, provider outages, and stat corrections do not automatically generate a cash redemption.

Before live launch, the applicable series rules must state whether a lifecycle event results in continued secondary trading, a temporary halt, conversion to a legacy collectible status, market closure, or another disclosed treatment.

Any platform-funded redemption or buyback, if ever offered, must be expressly disclosed in advance, independently funded, and not rely on customer money belonging to other users.

## 8. Sandbox retirement simulator

Legacy sandbox code includes a seven-day reference-price retirement cashout and a simulated settlement reserve. This behavior exists only for testing older settlement mechanics. It is **not** part of the planned live digital-collectible product and must not be marketed as a production promise.

## 9. Market integrity and conflicts

Platform, treasury, reserve, customer, and liquidity inventory must be separately tracked. If a NexAthleteXchange-controlled account trades against customers, that relationship and the applicable market-making rules must be disclosed. Production surveillance must detect or escalate wash trading, self-trading, unusual concentration, artificial volume, price manipulation, and suspicious account relationships.

## 10. Hard sandbox boundary

`liveFundsEnabled` remains false. Live trading cannot be enabled merely by changing public copy or connecting a payment API. Production identity, sanctions, location, custody/payment, surveillance, withdrawal, disclosure, and eligibility controls must be operational first.
