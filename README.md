# NexAthleteXchange

NexAthleteXchange is a sports-first athlete trading platform. **Launch sports are NBA and MLB.**

## Current Free Market

Create account → receive **N⟡5,000 NexPoints** → browse NBA/MLB teams and athletes → buy/sell units → portfolio and NexPoints balance update → every movement is recorded in the ledger.

NexPoints are virtual points with no real-money value.

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
