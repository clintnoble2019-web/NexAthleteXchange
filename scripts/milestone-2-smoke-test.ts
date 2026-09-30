import { PrismaClient, Sport } from "@prisma/client";
import { calculateNextPrice, pricingConfig, repriceAthlete } from "../lib/pricing";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function get(path: string) { return fetch(`${baseUrl}${path}`, { redirect: "manual" }); }

async function main() {
  try {
    for (const sport of [Sport.NBA, Sport.MLB]) {
      const athletes = await prisma.athlete.findMany({ where: { sport, active: true, marketEnabled: true }, include: { priceHistory: true }, orderBy: { name: "asc" } });
      assert(athletes.length >= 8, `${sport}: expected at least 8 market-ready athletes, got ${athletes.length}`);
      for (const athlete of athletes) assert(athlete.priceHistory.length >= 7, `${athlete.name} expected at least 7 price snapshots`);
      const teams = await prisma.team.findMany({ where: { sport, active: true } });
      assert(teams.length >= 8, `${sport}: expected at least 8 seeded teams, got ${teams.length}`);

      const market = await get(`/market?sport=${sport}`);
      assert(market.status === 200, `${sport} market expected 200, got ${market.status}`);
      const marketHtml = await market.text();
      assert(marketHtml.includes(`${sport} Athlete Market`), `${sport} market heading missing`);
      assert(marketHtml.includes("Browse by team"), `${sport} teams strip missing`);
      for (const athlete of athletes) assert(marketHtml.includes(`/athletes/${athlete.slug}`), `Market missing ${athlete.name}`);

      const discover = await get(`/discover?sport=${sport}`);
      assert(discover.status === 200, `${sport} Discover expected 200`);
      const discoverHtml = await discover.text();
      assert(discoverHtml.includes("Trending"), `${sport} Discover missing Trending`);
      assert(discoverHtml.includes("Value watch"), `${sport} Discover missing Value watch`);

      for (const athlete of athletes) {
        const page = await get(`/athletes/${athlete.slug}`);
        assert(page.status === 200, `${athlete.name} page expected 200`);
        const html = await page.text();
        assert(html.includes(athlete.name), `${athlete.name} page missing name`);
        assert(html.includes("Price history"), `${athlete.name} page missing price history`);
        assert(html.includes("NexGame analysis"), `${athlete.name} page missing analysis`);
        assert(html.includes("N⟡"), `${athlete.name} page is not using NexPoints symbol`);
      }
    }

    const missing = await get("/athletes/not-a-real-nex-athlete");
    assert(missing.status === 404, `Unknown athlete expected 404, got ${missing.status}`);
    const positive = calculateNextPrice(100, { performanceScore: 100, recentFormScore: 100, marketDemandScore: 100 });
    const negative = calculateNextPrice(100, { performanceScore: 0, recentFormScore: 0, marketDemandScore: 0 });
    assert(positive > 100, `Positive pricing inputs should raise price, got ${positive}`);
    assert(negative < 100, `Negative pricing inputs should lower price, got ${negative}`);
    assert(positive >= 1 && negative >= 1, "Pricing engine must never return a price below 1 NexPoint");
    assert(Math.abs(positive / 100 - 1) <= pricingConfig.maxDailyMovePct + 0.0001, "Positive price move exceeded configured cap");
    assert(Math.abs(negative / 100 - 1) <= pricingConfig.maxDailyMovePct + 0.0001, "Negative price move exceeded configured cap");

    const target = await prisma.athlete.findFirstOrThrow({ where: { sport: Sport.MLB, marketEnabled: true } });
    const beforePrice = Number(target.currentPrice);
    const beforeSnapshots = await prisma.priceSnapshot.count({ where: { athleteId: target.id } });
    const repriced = await repriceAthlete(target.id, { performanceScore: 90, recentFormScore: 85, marketDemandScore: 70 });
    const afterSnapshots = await prisma.priceSnapshot.count({ where: { athleteId: target.id } });
    assert(Number(repriced.previousPrice) === beforePrice, "Repricing should preserve prior current price as previousPrice");
    assert(Number(repriced.currentPrice) !== beforePrice, "Repricing should change current price");
    assert(afterSnapshots === beforeSnapshots + 1, "Repricing should add exactly one snapshot");
    console.log("Milestone 2 smoke test: PASS");
  } finally { await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
