import { PrismaClient } from "@prisma/client";
import { calculateNextPrice, pricingConfig, repriceAthlete } from "../lib/pricing";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function get(path: string) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual" });
}

async function main() {
  try {
    const athletes = await prisma.athlete.findMany({
      where: { sport: "MLB", active: true },
      include: { priceHistory: true },
      orderBy: { name: "asc" }
    });

    assert(athletes.length >= 8, `Expected at least 8 active MLB athletes, got ${athletes.length}`);
    for (const athlete of athletes) {
      assert(athlete.priceHistory.length >= 7, `${athlete.name} expected at least 7 price snapshots, got ${athlete.priceHistory.length}`);
    }

    const discover = await get("/discover");
    assert(discover.status === 200, `Discover expected 200, got ${discover.status}`);
    const discoverHtml = await discover.text();
    assert(discoverHtml.includes("Trending"), "Discover page is missing Trending");
    assert(discoverHtml.includes("Value watch"), "Discover page is missing Value watch");
    assert(athletes.some((athlete) => discoverHtml.includes(`/athletes/${athlete.slug}`)), "Discover page does not render any seeded athlete links");

    const market = await get("/market");
    assert(market.status === 200, `Market expected 200, got ${market.status}`);
    const marketHtml = await market.text();
    for (const athlete of athletes) {
      assert(marketHtml.includes(`/athletes/${athlete.slug}`), `Market is missing profile link for ${athlete.name}`);
    }

    for (const athlete of athletes) {
      const page = await get(`/athletes/${athlete.slug}`);
      assert(page.status === 200, `${athlete.name} page expected 200, got ${page.status}`);
      const html = await page.text();
      assert(html.includes(athlete.name), `${athlete.name} page is missing player name`);
      assert(html.includes("Price history"), `${athlete.name} page is missing Price history`);
      assert(html.includes("NexGame analysis"), `${athlete.name} page is missing NexGame analysis`);
      assert(html.includes(Number(athlete.currentPrice).toFixed(2)), `${athlete.name} page is missing current price`);
    }

    const missing = await get("/athletes/not-a-real-nex-athlete");
    assert(missing.status === 404, `Unknown athlete expected 404, got ${missing.status}`);

    const positive = calculateNextPrice(100, {
      performanceScore: 100,
      recentFormScore: 100,
      marketDemandScore: 100
    });
    const negative = calculateNextPrice(100, {
      performanceScore: 0,
      recentFormScore: 0,
      marketDemandScore: 0
    });
    assert(positive > 100, `Positive pricing inputs should raise price, got ${positive}`);
    assert(negative < 100, `Negative pricing inputs should lower price, got ${negative}`);
    assert(positive >= 1 && negative >= 1, "Pricing engine must never return a price below $1");
    assert(Math.abs(positive / 100 - 1) <= pricingConfig.maxDailyMovePct + 0.0001, "Positive price move exceeded configured cap");
    assert(Math.abs(negative / 100 - 1) <= pricingConfig.maxDailyMovePct + 0.0001, "Negative price move exceeded configured cap");

    const target = athletes[0];
    const beforePrice = Number(target.currentPrice);
    const beforeSnapshots = await prisma.priceSnapshot.count({ where: { athleteId: target.id } });
    const repriced = await repriceAthlete(target.id, {
      performanceScore: 90,
      recentFormScore: 85,
      marketDemandScore: 70
    });
    const afterSnapshots = await prisma.priceSnapshot.count({ where: { athleteId: target.id } });

    assert(Number(repriced.previousPrice) === beforePrice, `Repricing should preserve prior current price as previousPrice; expected ${beforePrice}, got ${repriced.previousPrice}`);
    assert(Number(repriced.currentPrice) !== beforePrice, "Repricing should change current price for the supplied positive inputs");
    assert(afterSnapshots === beforeSnapshots + 1, `Repricing should add exactly one snapshot; expected ${beforeSnapshots + 1}, got ${afterSnapshots}`);

    const latestSnapshot = await prisma.priceSnapshot.findFirst({
      where: { athleteId: target.id },
      orderBy: { createdAt: "desc" }
    });
    assert(latestSnapshot, "Latest price snapshot was not created");
    assert(Number(latestSnapshot.price) === Number(repriced.currentPrice), "Latest price snapshot does not match repriced athlete value");

    console.log("Milestone 2 smoke test: PASS");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
