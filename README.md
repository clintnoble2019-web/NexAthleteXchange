# NexAthleteXchange

NexAthleteXchange is a sports-first athlete trading platform. Year 1 focuses on MLB, NFL and NBA. Soccer is planned for Year 2.

## Milestone 1

Create account → receive $100,000 virtual cash → browse seeded MLB athletes → buy/sell units → portfolio and cash update → every movement is recorded in the transaction ledger.

## Stack

- Next.js + TypeScript
- PostgreSQL
- Prisma
- Server-side cookie sessions
- Clean custom CSS UI foundation

## Run locally

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open `http://localhost:3000/signup`.

## Architecture principle

The Free Market uses the same core athlete, portfolio, trade and ledger concepts intended to survive into later phases. Real-money operation is not enabled by this code and would require a separately approved compliance, custody, funding and settlement architecture.

## Milestone 2

- Athlete detail pages
- Price history
- Discovery screen (Trending + Value Watch)
- Configurable performance-led pricing module
- Price snapshot model ready for scheduled repricing
