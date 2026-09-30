# NexAthleteXchange

NexAthleteXchange is a sports-first athlete trading platform. **Launch sports are NBA and MLB.**

## Current Free Market

Create account → receive **N⟡5,000 NexPoints** → browse NBA/MLB teams and athletes → buy/sell units → portfolio and NexPoints balance update → every movement is recorded in the ledger.

NexPoints are virtual points with no real-money value.

## Planned Real Market: the scouting economy

**A market built on scouting conviction.** The planned first stage connects funded buyers and sellers of athlete positions. Performance data informs scouting and reference valuation; matching customer orders determine execution prices. Selling requires an available buyer. Actual trading data can support a later evaluation of professional liquidity providers, while net fee income can support company reserves and development.

Real Market remains coming soon. The public copy describes the plan. Customer order matching can now be tested with fake money at `/real-market/test`; reference-price and LP simulators remain separate, and live funds remain disabled. See [docs/CUSTOMER_MATCHING_TEST.md](docs/CUSTOMER_MATCHING_TEST.md) for setup. The current product decisions, earnings-retention policy, retirement-policy gaps, and implementation requirements are in [docs/REAL_MARKET_LAUNCH_MODEL.md](docs/REAL_MARKET_LAUNCH_MODEL.md).

## Stack

- Next.js + TypeScript
- PostgreSQL
- Prisma
- Server-side cookie sessions
- BALLDONTLIE-ready NBA + MLB roster sync

## Run locally

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000/signup`.

## BALLDONTLIE roster sync

Put your BALLDONTLIE All Access key in your local `.env` only:

```env
BALLDONTLIE_API_KEY="your-key-here"
```

Then run:

```bash
npm run sync:rosters
```

The sync pulls NBA and MLB teams plus all active players. Existing market players keep their pricing. Newly imported roster players are stored with `marketEnabled=false` until the pricing engine initializes them, so roster ingestion cannot accidentally publish placeholder prices.

## Milestone 2

- NBA + MLB launch tabs
- Team strip at the top of the market
- Athlete detail pages
- Price history
- Discovery screen
- Configurable pricing module
- BALLDONTLIE roster-ingestion foundation

## Foundation 4

Beta operations, protected admin controls, KYC-first sandbox enrollment, reward eligibility, request replay protection, and password recovery are documented in [docs/FOUNDATION_4.md](docs/FOUNDATION_4.md). Apply the additive release SQL before deploying this code. Production identity and email integrations must be configured separately; live funds remain disabled.
