# Real Market Production Compliance Checklist

This checklist records the conservative production controls NexAthleteXchange is designed to require before live funds are enabled. It is an engineering/operations checklist, not a representation that every jurisdiction has approved the product.

## Product structure

- [x] Public model defined as limited-supply digital athlete collectibles/units.
- [x] Scout Value separated from executable market price.
- [x] No guaranteed profit, buyer, minimum value, or Scout-Value redemption.
- [x] Digital collectible does not represent athlete/team/company equity or athlete earnings.
- [x] Game results do not automatically create a cash payout.
- [x] Fixed sandbox supply and allocation controls documented.
- [ ] Final live maximum supply/allocation published for every athlete series.
- [ ] Final conflicts/liquidity disclosure published for any platform-controlled inventory.

## Terms, disclosures, and privacy

- [x] Versioned Terms of Service page.
- [x] Explicit electronic acceptance after new-account signup.
- [x] Current Terms acceptance required before Real Market enrollment/access.
- [x] Acceptance version, digest, time, eligibility acknowledgements, and hashed security metadata retained in append-only audit records.
- [x] Real Market Risk Disclosure page.
- [x] Privacy Notice page, including California privacy-rights notice.
- [ ] Production support/contact and privacy-request workflow.
- [ ] Re-acceptance process tested when Terms version changes.

## Identity / AML / sanctions / geography

- [ ] Production KYC vendor integrated with signed/authenticated webhooks.
- [ ] Stable person identifier used to enforce one Real Market account per verified person.
- [ ] Age verification (minimum 18; stricter where required).
- [ ] OFAC/sanctions screening at onboarding plus risk-based re-screening.
- [ ] Wallet/address screening for supported crypto deposits and withdrawals.
- [ ] Geolocation provider integrated for live-money actions.
- [ ] VPN/proxy/location-circumvention controls.
- [ ] Jurisdiction allowlist implemented and version-controlled.
- [ ] Enhanced due-diligence/manual-review workflow.
- [ ] Transaction-monitoring and suspicious-activity escalation workflow.

## Payments / custody / withdrawals

- [ ] Approved fiat/crypto payment or custody provider selected.
- [ ] Determine and document whether NexAthleteXchange or a provider is the regulated money-transmission/custody party for each rail.
- [ ] Provider webhook signatures and replay protection.
- [ ] Deposit settlement/finality and chargeback handling.
- [ ] Customer/company/reserve funds separately accounted and reconciled.
- [ ] Withdrawal limits, holds, destination screening, and manual review.
- [ ] Supported blockchain/network allowlist.
- [ ] Incident and failed-withdrawal handling.

## Market integrity

- [x] Cash/position backing for customer orders in sandbox.
- [x] Self-cross prevention in the customer test market.
- [x] Account freeze and market halt controls.
- [x] Immutable audit records for sensitive administrative actions.
- [ ] Production wash-trade detection.
- [ ] Related-account/collusion detection.
- [ ] Spoofing/artificial-volume surveillance.
- [ ] Concentration and platform-inventory reports.
- [ ] Production error-trade and stale-data policies.
- [ ] Market-abuse investigation/runbook.

## Live-funds gate

Keep `liveFundsEnabled = false` until the production controls above that apply to the actual launch configuration are operational. Environment readiness flags are defense-in-depth indicators only and do not override the hard live-funds guard.

## Primary official references reviewed for this design

- SEC, Transactions Involving Crypto Assets (Howey / investment-contract analysis), updated 2026.
- FinCEN, Application of FinCEN's Regulations to Persons Administering, Exchanging, or Using Virtual Currencies.
- FinCEN, Am I an MSB? and MSB registration guidance.
- OFAC, Sanctions Compliance Guidance for the Virtual Currency Industry and FAQ 560.
- California Attorney General, California Consumer Privacy Act (CCPA) guidance.

Regulatory treatment depends on facts, counterparties, custody/funding structure, marketing, and user location. The launch allowlist should therefore be based on the final live product, not the sandbox label.
