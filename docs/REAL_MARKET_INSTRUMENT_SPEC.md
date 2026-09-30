# NexAthleteXchange Real Market — Instrument Specification

Status: Sandbox design
Live funds: Disabled

Current launch direction: [The Scouting Economy](REAL_MARKET_LAUNCH_MODEL.md). The first stage is planned around matching funded customer orders; LP quoting is a possible later stage. Reference-price retirement/redemption rules below describe existing sandbox behavior and are not approved live payout promises.

## 1. Launch universe

The Real Market launches with exactly 60 athlete instruments:

- NBA: 20 active, recognizable athletes across the basketball position spectrum.
- NFL: 20 active, recognizable athletes limited to QB, WR, and RB at launch.
- MLB: 20 active, recognizable athletes across hitter, fielding, and pitching positions.

The Free Market remains open to the full provider-tracked athlete pool. The 60-instrument cap applies only to the Real Market so the liquidity mandate remains bounded and measurable.

Real Market eligibility requires an active athlete, reliable provider coverage, an enabled performance-pricing history, sufficient playing opportunity, and expected customer demand. Final production selection is a manual business decision; sandbox selection uses eligible top-ranked candidates only for testing.

## 2. Instrument definition

A Real Market athlete position is a persistent position tied to one athlete. It is not a one-game proposition and does not automatically expire after a game. A holder keeps the position until it is sold or the instrument is retired under the lifecycle rules below.

The NexAthleteXchange performance engine produces the reference price. Customer trading volume does not directly set that reference price. In the planned first stage, customer buy and sell orders determine executable prices. The reference price is a scouting guide, not a guaranteed exit value. Sandbox liquidity providers quote bids and asks around the reference price as a prototype for a possible later stage.

## 3. Reference pricing and LP quotes

Each instrument has:

- reference price
- best bid
- best ask
- bid depth
- ask depth
- instrument status

The reference price is updated from the NexAthleteXchange performance engine while an instrument is ACTIVE. A live first-stage execution will require a funded buyer and an inventory-backed seller; customer matching is not yet implemented. In the LP sandbox, quotes are constrained by spread, depth, exposure, and uptime limits.

LP maker fee target: $0.00.
Retail execution fee: $2.00 per executed buy or sell.

## 4. Instrument states

- ACTIVE — normal two-sided quoting and customer trading.
- HALTED — all quoting/trading paused by platform risk controls.
- RETIRING — career-ending event confirmed; no new buys; reference value frozen; seven-day exit window.
- SETTLED — settlement processing completed if an intermediate operational state is required.
- RETIRED — instrument permanently removed from active Real Market trading.

## 5. Existing sandbox career-ending injury / injury-forced retirement

The following simulator lifecycle must be reviewed against the new launch model. Do not market a guaranteed reference-price exit or seven-day redemption until final terms and sufficient independent payout backing are approved.

A career-ending trigger must be based on a pre-approved objective source such as an official league/team announcement or confirmed athlete retirement announcement. Rumors and social-media speculation are not sufficient.

When the trigger is confirmed:

1. New purchases stop immediately.
2. Outstanding LP quotes are cancelled.
3. The instrument enters RETIRING.
4. The settlement price freezes at the last valid NexAthleteXchange reference price before the event is recognized.
5. Holders receive a seven-calendar-day exit window at the frozen settlement value.
6. The frozen value does not reprice during the retirement window.
7. After seven days, all remaining positions are automatically redeemed at the same frozen value.
8. Compulsory retirement redemption is funded from the NexAthleteXchange settlement reserve, not forced onto the liquidity provider.
9. The instrument becomes RETIRED.
10. The next eligible athlete for that sport is introduced so the active universe returns to 20 instruments.

Sandbox automatic retirement settlement is fee-free. Production fee treatment must be disclosed before launch and cannot be changed retroactively for an open retirement window.

## 6. Season-ending and temporary injuries

A season-ending or long-term injury is not automatically a career-ending event. Temporary injury policy remains separate from retirement. The platform may halt an instrument while data/status is verified, then resume ACTIVE trading under the normal pricing model.

## 7. Other lifecycle events still requiring final production rules

Before LIVE activation, the production policy must define treatment for:

- ordinary retirement
- release/cut/free agency with no team
- prolonged inactivity
- suspension
- league exit
- data-provider loss
- stat corrections
- provider outage
- player-name/identity corrections
- team trades
- death or permanent inability to play

No live launch may rely on ad-hoc treatment of these events.

## 8. Replacement policy

A retired instrument does not transfer into the replacement athlete. The retiring athlete is settled independently. The replacement athlete enters as a new instrument with its own reference price and inventory/liquidity setup.

Real Market target after replacement remains:

- NBA 20
- NFL 20
- MLB 20
- Total 60

## 9. Settlement reserve

The existing simulator maintains a separate sandbox retirement settlement reserve. It models funding compulsory redemptions without assigning them to an LP. No live reserve or live payout guarantee is established by these records.

Sandbox settlement fails closed if the reserve cannot cover all outstanding positions. Production must have reserve monitoring, alerting, minimum capitalization rules, and documented funding policy before LIVE activation.

## 10. Hard sandbox boundary

This specification is implemented only in the SANDBOX environment today. `liveFundsEnabled` remains false. No section of this document authorizes real-money operation by itself.
