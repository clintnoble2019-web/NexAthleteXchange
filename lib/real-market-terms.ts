export const REAL_MARKET_TERMS_VERSION = "2026-09-30-v2";
export const REAL_MARKET_TERMS_EFFECTIVE_DATE = "September 30, 2026";
export const REAL_MARKET_TERMS_TITLE = "NexAthleteXchange Terms of Service and Real Market Agreement";

export type TermsSection = {
  title: string;
  paragraphs: string[];
};

export const REAL_MARKET_TERMS_PREAMBLE = [
  "These Terms of Service and Real Market Agreement (the \"Terms\") govern access to and use of NexAthleteXchange, including the Free Market, athlete research and analytics, simulated or test markets, account services, promotions, and any future live Real Market feature that NexAthleteXchange makes available to an eligible user. These Terms form a binding agreement between the user and the legal operator of NexAthleteXchange identified in the service at the time a live-money product is offered.",
  "The Privacy Notice, Real Market Risk Disclosure, fee schedule, product-specific market rules, eligibility notices, promotion terms, and any other policy expressly incorporated by reference are part of these Terms. If a product-specific rule conflicts with these general Terms, the more specific rule controls for that product to the extent permitted by applicable law.",
  "Real-money Real Market functionality is not enabled merely because these Terms are accepted. Live access remains conditioned on product and jurisdiction review, operator approvals, identity and sanctions controls, payment or custody provider approval, and any other legal or operational requirement applicable at launch.",
];

export const REAL_MARKET_TERMS_SECTIONS: TermsSection[] = [
  {
    title: "1. Acceptance, electronic signature, and authority",
    paragraphs: [
      "You must affirmatively accept these Terms before using gated Real Market features. Clicking the acceptance button and providing the required electronic signature confirmation is intended to have the same effect as signing a written agreement, to the extent permitted by applicable law.",
      "You represent that you are accepting these Terms for yourself, that you have legal capacity to enter a binding contract, and that information you provide in connection with acceptance is accurate. If you are not legally permitted to agree to these Terms, you may not use the gated Real Market features.",
    ],
  },
  {
    title: "2. Eligibility, age, and geographic restrictions",
    paragraphs: [
      "You must be at least 18 years old and satisfy any higher age requirement that applies where you are located. A live Real Market may be unavailable in some countries, states, provinces, territories, or other jurisdictions even if other NexAthleteXchange features are available there.",
      "You must provide your true current country and region when requested. You may not use a VPN, proxy, remote desktop, false address, location spoofing, another person's identity, or any other method to evade a geographic, age, sanctions, payment-provider, or product-eligibility restriction.",
      "NexAthleteXchange may change an eligibility list prospectively when laws, provider rules, licensing requirements, sanctions, or risk controls change. Eligibility at one time does not guarantee future eligibility.",
    ],
  },
  {
    title: "3. Account registration, ownership, and security",
    paragraphs: [
      "You must provide accurate registration information, keep your credentials secure, and promptly update information that becomes inaccurate. You are responsible for activity performed through your account unless applicable law provides otherwise.",
      "One verified person may maintain only one Real Market account unless NexAthleteXchange expressly authorizes another arrangement in writing. Account sharing, account sales, identity lending, credential trafficking, and creating or controlling accounts for another person are prohibited.",
      "You must promptly notify NexAthleteXchange of suspected unauthorized access, credential compromise, or fraudulent activity. NexAthleteXchange may require password resets, additional verification, session revocation, or temporary account restrictions to protect users and market integrity.",
    ],
  },
  {
    title: "4. Identity verification, sanctions, AML, and source-of-funds controls",
    paragraphs: [
      "Before allowing live funding, trading, transfers, or withdrawals, NexAthleteXchange or its providers may require identity verification, age verification, sanctions screening, watchlist screening, location verification, wallet screening, source-of-funds or source-of-wealth information, transaction monitoring, fraud review, and additional due diligence.",
      "You authorize NexAthleteXchange and its approved providers to use information you submit for those compliance and fraud-prevention purposes, subject to the Privacy Notice. You must not transact on behalf of a sanctioned person, prohibited jurisdiction, undisclosed third party, or person attempting to avoid legal or provider controls.",
      "NexAthleteXchange may reject, hold, limit, freeze, investigate, or report activity when required by law, legal process, sanctions obligations, provider requirements, or reasonably designed financial-crime controls. Sandbox or administrator verification does not qualify as live KYC unless the live product expressly says so.",
    ],
  },
  {
    title: "5. Nature of digital athlete collectibles",
    paragraphs: [
      "The planned Real Market uses limited-supply digital athlete collectibles or units associated with named professional athletes. A collectible is a marketplace item recorded by NexAthleteXchange or an approved service provider under disclosed product rules.",
      "A collectible does not give you ownership of an athlete, team, league, NexAthleteXchange, or any underlying business. It does not grant rights to an athlete's salary, endorsement income, prize money, intellectual property, publicity rights, team revenue, league revenue, dividends, interest, voting rights, or management rights unless a future product disclosure expressly and lawfully states otherwise.",
      "These Terms do not make a legal conclusion about how any live product will be classified by a regulator or court. Regulatory treatment depends on the final product design, facts, jurisdiction, and applicable law. NexAthleteXchange may change or withhold a live product if required by legal review.",
    ],
  },
  {
    title: "6. No guaranteed profit, return, redemption, or cash entitlement",
    paragraphs: [
      "Collectibles can increase or decrease in price, become highly volatile, or become illiquid. NexAthleteXchange does not guarantee a profit, return, yield, appreciation, minimum value, buyer, seller, market depth, resale opportunity, or redemption price.",
      "Athlete performance, rankings, Scout Values, charts, projections, and research do not create a contractual right to cash. Unless a separate written product rule expressly creates a lawful redemption right, NexAthleteXchange has no obligation to repurchase a collectible from you.",
    ],
  },
  {
    title: "7. Fixed supply, issuance, allocations, and treasury inventory",
    paragraphs: [
      "Before live issuance, each athlete series must have a disclosed maximum supply and an allocation policy identifying, as applicable, customer float, market-maker inventory, liquidity reserve, treasury inventory, promotional inventory, and any other material allocation category.",
      "NexAthleteXchange will not intentionally create units above a disclosed maximum supply without first changing the product rules and obtaining any required new user consent. Transfers among disclosed inventory categories do not themselves increase maximum supply.",
      "Platform-controlled, treasury, reserve, or market-maker inventory may create conflicts of interest. Material platform inventory practices, release rules, and market-making practices must be disclosed before live use and are subject to market-integrity controls.",
    ],
  },
  {
    title: "8. Market prices, Scout Values, and reference data",
    paragraphs: [
      "Scout Values, athlete ratings, projections, performance scores, historical charts, and similar metrics are research references. They may be based on third-party data, models, assumptions, or delayed information and may be corrected without creating a cash claim.",
      "An executable market price is determined by available bids, asks, completed transactions, quantity, and market depth under the applicable matching rules. A displayed reference value is not a promise that you can buy or sell at that value.",
    ],
  },
  {
    title: "9. Orders, execution, price-time priority, and partial fills",
    paragraphs: [
      "Orders are subject to the order types, minimums, increments, price bands, matching priority, and other rules displayed for the applicable market. A limit order may remain open, partially fill, fill in multiple transactions, or never fill.",
      "Unless disclosed otherwise, better-priced executable orders receive priority before worse-priced orders, and orders at the same price are prioritized by arrival time. Execution may occur at the resting order's price or another price permitted by the disclosed matching rules.",
      "Submitting an order does not guarantee execution. NexAthleteXchange may reject or cancel an order that violates product rules, risk limits, account restrictions, sanctions controls, market halts, or technical safeguards.",
    ],
  },
  {
    title: "10. Market makers, liquidity providers, and conflicts",
    paragraphs: [
      "NexAthleteXchange may use affiliated or unaffiliated market makers or liquidity providers to display bids and asks. Such participants may trade for their own inventory and may profit from spreads or price movements.",
      "A platform-affiliated market maker must operate under disclosed inventory, risk, and quote rules. NexAthleteXchange does not promise continuous two-sided liquidity and may widen, remove, or halt quotes when inventory, risk, data integrity, provider availability, or market conditions require it.",
      "Customer orders may compete with market-maker orders. NexAthleteXchange will not knowingly give an affiliated market maker undisclosed priority over a customer's better-priced order if the published matching rules provide customer price-time priority.",
    ],
  },
  {
    title: "11. Volatility, liquidity, slippage, and loss risk",
    paragraphs: [
      "Prices can move rapidly because of athlete performance, injury, news, trading activity, limited supply, thin order books, market-maker inventory, data corrections, or other factors. You may lose some or all of the amount you spend on a collectible.",
      "Large orders may execute across multiple price levels and experience slippage or may leave an unfilled remainder. Market depth can disappear without notice. You should review the order price and quantity before confirming a transaction.",
    ],
  },
  {
    title: "12. Athlete events, retirement, injury, suspension, and death",
    paragraphs: [
      "Retirement, career-ending injury, suspension, death, league departure, team change, contract status, public controversy, statistical correction, or another athlete event may materially affect demand, liquidity, research values, or whether a market remains open.",
      "An athlete event does not automatically create a payout or platform repurchase. Any live lifecycle, retirement, settlement, wind-down, or delisting rule must be disclosed before the relevant live market is offered and may include a waiting period, market closure, transfer restriction, or other process permitted by law.",
    ],
  },
  {
    title: "13. Data providers, corrections, and erroneous information",
    paragraphs: [
      "Sports statistics and related information may come from third-party providers and can be delayed, corrected, unavailable, or inaccurate. NexAthleteXchange may correct research data, reference values, display errors, and non-economic bookkeeping errors when discovered.",
      "Where a transaction is affected by an obvious technical or market-system error, NexAthleteXchange may take action permitted by applicable law and published market rules, including canceling an unexecuted order, halting a market, correcting an erroneous ledger entry, or investigating a clearly erroneous execution. NexAthleteXchange will not use this clause to retroactively change a valid trade merely because the market later moved against the platform or another participant.",
    ],
  },
  {
    title: "14. Fees, spreads, and pricing disclosures",
    paragraphs: [
      "Any live trading fee, withdrawal fee, deposit fee, spread, network fee, custody fee, subscription charge, or other mandatory charge must be disclosed before you incur the charge. Sandbox fee examples are test rules and are not a promise of a future live fee schedule.",
      "NexAthleteXchange may change fees prospectively with notice. A fee change does not retroactively alter fees already charged on completed transactions. Taxes or third-party network costs may be separate from platform fees where permitted and disclosed.",
    ],
  },
  {
    title: "15. Funding, payment rails, settlement, and chargebacks",
    paragraphs: [
      "If live funding is launched, supported methods may include approved bank, card, payment, or digital-asset rails. Availability, deposit limits, settlement times, reversibility, holds, and provider requirements may differ by method and location.",
      "A displayed deposit may remain subject to settlement, fraud review, chargeback rights, sanctions controls, payment reversals, or provider confirmation. NexAthleteXchange may place a reasonable hold on unsettled or disputed funds and may offset a valid reversal against the related account balance where permitted by law.",
      "Fake sandbox cash has no real monetary value and cannot be withdrawn, redeemed, or converted into real USDC or fiat currency.",
    ],
  },
  {
    title: "16. Custody, stablecoins, blockchains, and wallet risks",
    paragraphs: [
      "If a supported live feature uses USDC or another digital asset, the feature may involve issuer, depegging, custody, wallet, smart-contract, blockchain, validator, network congestion, sanctions-screening, and irreversible-transfer risks.",
      "Only assets and networks explicitly supported by the funding interface should be used. Sending an unsupported asset, using the wrong blockchain, or entering an incorrect destination may result in permanent loss. NexAthleteXchange does not guarantee recovery of misdirected blockchain transfers.",
      "Provider-controlled testnet assets have no real monetary value unless the applicable provider expressly states otherwise. Testnet balances must remain separate from fake market cash and from any future live customer funds.",
    ],
  },
  {
    title: "17. Withdrawals, holds, reserves, and account closure",
    paragraphs: [
      "Withdrawals may be subject to identity status, available settled balance, open-order holds, fraud or sanctions review, wallet screening, payment-provider limits, network conditions, minimums, and legally required restrictions.",
      "NexAthleteXchange may delay or block a withdrawal when reasonably necessary to comply with law, legal process, sanctions requirements, fraud controls, disputed transactions, security incidents, or provider restrictions. Legitimate settled customer value does not become company revenue solely because an account is restricted or closed.",
    ],
  },
  {
    title: "18. Taxes and reporting",
    paragraphs: [
      "You are responsible for determining and satisfying tax obligations associated with your activity. NexAthleteXchange does not provide personalized tax advice and may provide information returns, transaction histories, or other reports when required by law.",
      "Tax treatment can vary by jurisdiction and by the final legal classification of a product. You should consult a qualified tax professional if you need advice about your circumstances.",
    ],
  },
  {
    title: "19. Prohibited trading and market manipulation",
    paragraphs: [
      "You may not engage in wash trading, self-dealing intended to create false volume, matched orders designed to mislead, spoofing, layering, manipulation, collusion, artificial price creation, front-running based on unauthorized confidential information, fraudulent trading, or coordinated activity intended to create a false or misleading appearance of supply, demand, price, or liquidity.",
      "You may not exploit stale quotes, software defects, race conditions, provider outages, or erroneous data in a manner intended to obtain value you know you are not entitled to receive. If you discover a material security or market defect, you should report it rather than intentionally abuse it.",
    ],
  },
  {
    title: "20. Prohibited account and financial-crime activity",
    paragraphs: [
      "You may not use NexAthleteXchange for money laundering, sanctions evasion, terrorist financing, fraud, theft, stolen payment instruments, unauthorized third-party transfers, identity fraud, account farming, bonus abuse, or concealment of beneficial ownership or control.",
      "NexAthleteXchange may preserve records and cooperate with lawful requests from regulators, courts, law enforcement, payment providers, custody providers, or other authorized parties, subject to applicable privacy and legal requirements.",
    ],
  },
  {
    title: "21. Automation, APIs, scraping, and security",
    paragraphs: [
      "You may use an official API or automation only as expressly permitted by applicable product rules and credentials. Unauthorized bots, scraping that materially burdens the service, credential stuffing, denial-of-service activity, bypassing rate limits, reverse engineering for abuse, or attempts to access another user's data are prohibited.",
      "NexAthleteXchange may impose rate limits, revoke tokens, require additional authentication, or block abusive traffic to protect the service and market integrity.",
    ],
  },
  {
    title: "22. Promotions, bonuses, rewards, and referrals",
    paragraphs: [
      "Promotions, bonuses, referral rewards, early-user incentives, or token-related rewards are governed by their specific rules, eligibility requirements, expiration terms, and anti-abuse controls. A promotion does not create an ongoing entitlement unless its written rules expressly say so.",
      "NexAthleteXchange may deny or reverse an improperly obtained promotional credit when permitted by the promotion rules and applicable law, including for duplicate identities, multi-accounting, fraud, or manipulation.",
    ],
  },
  {
    title: "23. Intellectual property, athlete references, and licenses",
    paragraphs: [
      "NexAthleteXchange software, branding, interface design, original text, original graphics, and proprietary analytics may be protected by intellectual-property laws. Subject to these Terms, you receive a limited, revocable, non-exclusive license to use the service for its intended personal or otherwise authorized purpose.",
      "Athlete names, statistics, factual sports information, team names, league names, logos, images, trademarks, publicity rights, and other materials may be owned by their respective rights holders. Purchasing a collectible does not transfer copyright, trademark, publicity, endorsement, merchandising, or licensing rights in an athlete, team, league, or third party.",
    ],
  },
  {
    title: "24. Third-party services and providers",
    paragraphs: [
      "NexAthleteXchange may rely on third parties for sports data, identity verification, sanctions screening, payments, custody, blockchain infrastructure, cloud hosting, communications, fraud detection, and other services. Your use of a third-party feature may also be subject to that provider's terms or privacy practices when clearly disclosed.",
      "A third-party outage or policy change may affect service availability. NexAthleteXchange may change providers or disable a feature when reasonably necessary for security, compliance, reliability, or product operation.",
    ],
  },
  {
    title: "25. Privacy, records, and monitoring",
    paragraphs: [
      "The Privacy Notice explains how NexAthleteXchange collects, uses, retains, and shares personal information. Compliance and security records may include account information, identity-verification results, transaction records, device or request metadata, geolocation-related results where permitted, sanctions results, and audit records.",
      "NexAthleteXchange may monitor activity for fraud, abuse, market integrity, security, sanctions, compliance, and service reliability. Records may be retained for the period required by applicable law, legitimate business needs, dispute preservation, or provider obligations.",
    ],
  },
  {
    title: "26. Electronic communications and records",
    paragraphs: [
      "You consent to receive agreements, disclosures, confirmations, statements, notices, tax documents, compliance requests, and other account communications electronically unless applicable law requires another method. You are responsible for maintaining a valid email address or other supported electronic contact method.",
      "By accepting electronically, you confirm that you can access the Terms and incorporated disclosures on your device and can save or print them for your records. You may withdraw consent to electronic communications where applicable law gives you that right, but doing so may require closure or limitation of features that can only be provided electronically.",
    ],
  },
  {
    title: "27. Service availability, maintenance, and market halts",
    paragraphs: [
      "The service may experience scheduled maintenance, outages, degraded performance, cybersecurity incidents, database failures, provider failures, blockchain congestion, or other interruptions. NexAthleteXchange does not guarantee uninterrupted availability.",
      "NexAthleteXchange may pause order entry, cancel unexecuted orders, halt an athlete market, restrict funding or withdrawals, or place the service in a protective mode when reasonably necessary for data integrity, market integrity, compliance, security, provider outages, or operational risk.",
    ],
  },
  {
    title: "28. Account suspension, restriction, and termination",
    paragraphs: [
      "NexAthleteXchange may suspend, restrict, or terminate an account for Terms violations, fraud, manipulation, security threats, sanctions concerns, illegal activity, chargeback abuse, false information, required legal process, provider requirements, or other material risk-control reasons.",
      "Where permitted and operationally possible, NexAthleteXchange will provide a process for resolving a legitimate remaining settled balance after account closure, subject to legal holds, provider restrictions, dispute resolution, sanctions requirements, and applicable law.",
    ],
  },
  {
    title: "29. No investment, legal, tax, or betting advice",
    paragraphs: [
      "NexAthleteXchange provides a sports marketplace and research experience. It does not provide individualized investment, securities, commodity, legal, tax, accounting, or betting advice. Content, rankings, data, and analytics are general information and should not be treated as a recommendation tailored to your circumstances.",
      "You are responsible for deciding whether a transaction is appropriate for you and lawful where you are located. Past athlete performance, prior collectible prices, popularity, projections, or platform research do not guarantee future results.",
    ],
  },
  {
    title: "30. Disclaimers and non-waivable consumer rights",
    paragraphs: [
      "To the maximum extent permitted by applicable law, NexAthleteXchange is provided on an \"as available\" basis and does not promise that the service, data, markets, providers, or third-party content will always be accurate, available, secure, liquid, profitable, or error-free.",
      "Nothing in these Terms excludes, limits, or waives a warranty, remedy, statutory right, or consumer protection that applicable law does not permit to be excluded, limited, or waived.",
    ],
  },
  {
    title: "31. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by applicable law, NexAthleteXchange and its affiliates, officers, employees, contractors, and service providers will not be liable for indirect, incidental, special, exemplary, punitive, or consequential damages arising from use of the service, including lost opportunities or lost profits, where such limitations are legally enforceable.",
      "Any monetary limitation of liability for a future live-money product must be stated in the live product's final legal terms and may be restricted by consumer-protection or other applicable law. These sandbox Terms do not eliminate liability that cannot lawfully be limited.",
    ],
  },
  {
    title: "32. Indemnification for wrongful conduct",
    paragraphs: [
      "To the extent permitted by applicable law, you agree to indemnify NexAthleteXchange against third-party claims, losses, and reasonable costs caused by your fraud, unlawful conduct, intentional market manipulation, infringement of third-party rights, unauthorized use of another person's account or payment method, or material breach of these Terms.",
      "This indemnification provision does not require a consumer to indemnify NexAthleteXchange for NexAthleteXchange's own unlawful conduct or for liability that applicable law does not permit to be shifted.",
    ],
  },
  {
    title: "33. Complaints, disputes, and governing law",
    paragraphs: [
      "Before filing a formal claim where not prohibited by law, users are encouraged to contact the support or legal-notice channel published by NexAthleteXchange so the parties can attempt to resolve the issue. This informal process does not shorten a legally applicable limitation period unless a valid written rule expressly provides otherwise.",
      "The final live-money agreement must identify the legal operator, governing law, legal-notice address, and any court, arbitration, or other dispute procedure that will apply to live activity. NexAthleteXchange will not rely on an undisclosed arbitration clause or undisclosed venue term for a live product. Mandatory rights under the law of your residence remain applicable where they cannot be waived.",
    ],
  },
  {
    title: "34. Changes to the service and product discontinuation",
    paragraphs: [
      "NexAthleteXchange may add, modify, pause, or discontinue features prospectively for legal, provider, security, market-integrity, commercial, or technical reasons. Material changes affecting live customer value must follow any notice, withdrawal, wind-down, or other process required by applicable law and published product rules.",
      "Discontinuing a feature does not authorize NexAthleteXchange to confiscate legitimate settled customer value. Any wind-down remains subject to law, provider restrictions, open disputes, sanctions, and the applicable product rules.",
    ],
  },
  {
    title: "35. Changes to these Terms and mandatory re-acceptance",
    paragraphs: [
      "NexAthleteXchange may revise these Terms prospectively. When a change is material to Real Market rights, risks, fees, product structure, dispute terms, funding, custody, or compliance obligations, NexAthleteXchange may require a new affirmative acceptance before you can continue using the affected feature.",
      "The service records the Terms version and cryptographic digest associated with an acceptance. Acceptance of an older version does not count as acceptance of a materially revised version when the service requires re-acceptance.",
    ],
  },
  {
    title: "36. Assignment, severability, waiver, and entire agreement",
    paragraphs: [
      "You may not transfer your account or rights under these Terms to another person without written approval where such transfer is legally permitted. NexAthleteXchange may assign these Terms in connection with a lawful corporate reorganization, financing, acquisition, sale of the service, or transfer to a successor operator, subject to applicable notice requirements.",
      "If a provision is found unenforceable, the remaining provisions remain effective to the extent permitted by law. Failure to enforce a provision once is not a permanent waiver. These Terms and incorporated policies constitute the agreement concerning the covered service except for separate written agreements that expressly supersede them.",
    ],
  },
  {
    title: "37. Operator information and legal notices",
    paragraphs: [
      "Before any live-money Real Market launch, NexAthleteXchange must publish the legal name of the operating entity, a business or legal-notice address, an effective support or legal contact method, and any licensing or registration disclosure required for the jurisdictions in which the live product is offered.",
      "Until those live operator disclosures and approvals are in place, acceptance of these Terms supports the test and compliance-development environment only and does not represent that a live financial product is authorized, licensed, registered, or available in your jurisdiction.",
    ],
  },
  {
    title: "38. Live-launch compliance condition",
    paragraphs: [
      "These Terms are one part of the compliance framework, not a substitute for legal classification, licensing, registration, KYC/AML program design, sanctions procedures, money-transmission analysis, securities or commodities analysis, gaming analysis, custody and payments review, tax review, privacy compliance, cybersecurity controls, recordkeeping, complaint handling, or jurisdiction-specific requirements.",
      "NexAthleteXchange must complete the applicable legal and operational launch reviews before enabling real-money activity. If a final legal review requires different product terms, users may be required to accept another revised version before live use.",
    ],
  },
];

export const REAL_MARKET_TERMS_CANONICAL = JSON.stringify({
  title: REAL_MARKET_TERMS_TITLE,
  version: REAL_MARKET_TERMS_VERSION,
  effectiveDate: REAL_MARKET_TERMS_EFFECTIVE_DATE,
  preamble: REAL_MARKET_TERMS_PREAMBLE,
  sections: REAL_MARKET_TERMS_SECTIONS,
});
