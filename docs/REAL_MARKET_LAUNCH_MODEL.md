# Real Market — Digital Athlete Collectible Marketplace

Status: compliance-hardening design, September 30, 2026  
Live funds: disabled

## Product definition

The Real Market is designed as a marketplace for limited-supply digital athlete collectibles (units) associated with professional athletes. A unit is a persistent digital marketplace item. It is not equity, debt, a dividend, ownership of an athlete or team, a claim on athlete earnings, or a game-result wager.

NexAthleteXchange may publish sports statistics, rankings, charts, and a performance-derived **Scout Value**. Scout Value is research information only. It does not create a cash entitlement, guaranteed resale price, or mandatory redemption.

The **market price** is separate. It is determined by executable bids, asks, completed trades, and available depth in the Real Market order book.

## Supply and issuance

Before any live series is sold, NexAthleteXchange must disclose:

- maximum supply for that athlete series;
- initial allocation among customers, platform/treasury, reserve, and liquidity accounts;
- whether a platform or third-party liquidity account is active;
- whether any units are locked or unavailable for sale; and
- whether future minting is prohibited or permitted under a specifically disclosed rule.

The current sandbox target is 100,000 units per athlete. Sandbox inventory allocation is for testing and is not automatically the production allocation.

## Market execution

- Orders are limit orders backed by available cash or owned units.
- Unsupported short selling is not allowed.
- Buyers and sellers determine execution prices through the order book.
- Orders can fill, partially fill, wait, or remain unfilled.
- No customer is promised an instant buyer, guaranteed exit, guaranteed profit, or resale at Scout Value.
- Self-trading and manipulative crossing are prohibited.
- Matching priority, tick size, fee treatment, market halts, stale-data controls, and error-trade rules must be disclosed before live use.

## Performance and sports outcomes

Sports performance may influence Scout Value and customer demand, similar to how real-world events can influence demand for collectibles. Performance does **not** mechanically generate a cash payout. A game ending does not automatically settle an athlete unit.

This separation must remain true in live code and public marketing:

`Sports data -> Scout Value / research`  
`Customer orders -> cash market price`

## Athlete lifecycle events

Injury, retirement, suspension, death, league exit, team change, data-provider loss, and stat corrections do not automatically create a cash redemption. A live lifecycle policy may pause trading or change the collectible's status, but any special payout or buyback must be expressly disclosed and independently funded before the collectible is offered.

The older sandbox retirement cashout remains a simulator only and must not be treated as a production promise.

## Identity and eligibility

Before any live funding, trading, or withdrawal, production must require:

- current Terms of Service acceptance;
- age eligibility;
- production identity verification;
- one verified Real Market account per person;
- sanctions screening and ongoing re-screening as appropriate;
- jurisdiction/location eligibility and anti-circumvention controls;
- payment/custody eligibility; and
- enhanced review when transaction risk warrants it.

Sandbox identity review is not production KYC.

## Funding, custody, and crypto

The preferred production model is to use approved third-party payment/custody providers for fiat and USDC movement rather than having application code independently custody and transmit customer funds without the required regulatory framework.

Live payment integration must include:

- provider-authenticated webhooks;
- transaction idempotency;
- deposit finality/chargeback handling;
- wallet/address and sanctions controls for crypto;
- withdrawal holds and review rules;
- customer/company balance separation and reconciliation;
- incident and dispute procedures; and
- supported asset/network allowlists.

## Market integrity

Prohibited activity includes wash trading, spoofing, matched manipulation, false-volume schemes, collusion, multi-accounting, identity fraud, sanctions evasion, geolocation bypass, exploiting stale data, and unauthorized automation.

Operations must support market halts, account freezes, session revocation, order cancellation, immutable audit records, transaction monitoring, concentration reporting, suspicious-activity escalation, and reconciliation.

## Terms and disclosures

New accounts are routed through a versioned Terms acceptance flow. Real Market access also checks for the current Terms version before identity enrollment or customer test actions. The acceptance record stores the Terms version, a Terms digest, timestamp, eligibility acknowledgements, and hashed source/user-agent metadata in the existing append-only audit table.

Public disclosures must consistently use **digital athlete collectible**, **unit**, **Scout Value**, **best bid**, **best ask**, and **last trade** rather than stock/share/investment language.

## Production launch gates

`liveFundsEnabled` must remain false until all of the following are operational:

1. Production KYC/age verification.
2. Sanctions screening.
3. Geolocation and allowed-region enforcement.
4. Payment/custody provider integration.
5. Deposit/withdrawal reconciliation and limits.
6. Current Terms acceptance enforcement.
7. Market surveillance and anti-manipulation controls.
8. Final unit supply/allocation disclosure.
9. Final fee and lifecycle rules.
10. Privacy, risk, support, incident, and dispute processes.
11. A jurisdiction-by-jurisdiction launch allowlist based on the actual live product configuration.

Configuration flags alone do not turn live funds on; they are defense-in-depth indicators for the eventual production release process.
