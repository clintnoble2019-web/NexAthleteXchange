import { PrismaClient, Sport, TradeSide } from "@prisma/client";
import {
  calculateBoundedTargetPrice,
  calculateDailyBoundedTargetPrice,
  calculateMlbLiveImpact,
  calculateNbaLiveImpact,
} from "../lib/live-pricing";
import { gamePerformanceValue, lifetimePerformanceMarketCap } from "../lib/market-cap";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const unique = Date.now();
const email = `m4-${unique}@nexathletexchange.test`;
const username = `m4qa${String(unique).slice(-8)}`;
const slug = `m4-live-market-${unique}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function postForm(path: string, data: Record<string, string>, cookie?: string) {
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", origin: new URL(baseUrl).origin };
  if (cookie) headers.cookie = cookie;
  return fetch(`${baseUrl}${path}`, { method: "POST", headers, body: new URLSearchParams(path === "/api/trade" ? { ...data, requestKey: crypto.randomUUID() } : data), redirect: "manual" });
}

async function main() {
  assert(calculateBoundedTargetPrice(10, 20) === 11.2, "Upward live reprice did not respect 12% cap");
  assert(calculateBoundedTargetPrice(10, 2) === 8.8, "Downward live reprice did not respect 12% cap");
  assert(calculateBoundedTargetPrice(10, 10.5) === 10.5, "Live reprice did not move directly to nearby fair value");
  assert(calculateDailyBoundedTargetPrice(10, 20) === 11.2, "Daily opening-price cap failed upward");
  assert(calculateDailyBoundedTargetPrice(10, 2) === 8.8, "Daily opening-price cap failed downward");

  const nbaHotGame = calculateNbaLiveImpact(
    { min: "34", pts: 40, reb: 9, ast: 10, stl: 2, blk: 1, turnover: 2, plus_minus: 12 },
    { min: 34, pts: 25, reb: 6, ast: 6, stl: 1, blk: 0.5, tov: 3, plus_minus: 2 },
  );
  const nbaColdGame = calculateNbaLiveImpact(
    { min: "32", pts: 8, reb: 2, ast: 2, stl: 0, blk: 0, turnover: 5, plus_minus: -14 },
    { min: 34, pts: 25, reb: 6, ast: 6, stl: 1, blk: 0.5, tov: 3, plus_minus: 2 },
  );
  assert(nbaHotGame > 0 && nbaHotGame <= 0.06, "Strong NBA live game did not create a bounded positive impact");
  assert(nbaColdGame < 0 && nbaColdGame >= -0.06, "Poor NBA live game did not create a bounded negative impact");

  const mlbHotGame = calculateMlbLiveImpact({ at_bats: 4, hits: 3, doubles: 1, home_runs: 1, rbi: 4, runs: 2, strikeouts: 0 });
  const mlbColdGame = calculateMlbLiveImpact({ at_bats: 4, hits: 0, home_runs: 0, rbi: 0, runs: 0, strikeouts: 3 });
  assert(mlbHotGame > 0 && mlbHotGame <= 0.06, "Strong MLB live game did not create a bounded positive impact");
  assert(mlbColdGame < 0 && mlbColdGame >= -0.06, "Poor MLB live game did not create a bounded negative impact");

  assert(gamePerformanceValue(50, 0.06) === 300, "Positive game performance value was calculated incorrectly");
  assert(gamePerformanceValue(50, -0.06) === -300, "Negative game performance value was calculated incorrectly");
  assert(lifetimePerformanceMarketCap([300, -100, 250]) === 450, "Lifetime performance market cap did not sum game value correctly");
  assert(lifetimePerformanceMarketCap([-300, 100]) === 0, "Market cap must never display below zero");

  const athlete = await prisma.athlete.create({
    data: {
      name: `M4 Test Athlete ${unique}`,
      slug,
      sport: Sport.NBA,
      league: "NBA",
      team: "DEN",
      position: "G",
      currentPrice: 10,
      previousPrice: 10,
      performance: 70,
      marketCap: 1234.56,
      active: true,
      marketEnabled: true,
    },
  });

  try {
    const signup = await postForm("/api/auth/signup", {
      username,
      email,
      password: "Milestone4-Test-Password!",
    });
    assert(signup.status === 303, `Signup expected 303, got ${signup.status}`);
    const setCookie = signup.headers.get("set-cookie");
    assert(setCookie, "Signup did not return a session cookie");
    const cookie = setCookie.split(";")[0];

    const buy = await postForm("/api/trade", {
      athleteId: athlete.id,
      side: "BUY",
      quantity: "2.5",
      returnTo: `/athletes/${slug}`,
    }, cookie);
    assert(buy.status === 303, `Fractional buy expected 303, got ${buy.status}`);
    assert((buy.headers.get("location") || "").includes("trade=BUY"), "Buy redirect did not include success feedback");

    const athleteAfterBuy = await fetch(`${baseUrl}/athletes/${slug}?trade=BUY`, { headers: { cookie } });
    const athleteHtml = await athleteAfterBuy.text();
    assert(athleteAfterBuy.status === 200, "Athlete page failed after purchase");
    assert(athleteHtml.includes("You own"), "Athlete page did not show owned shares");
    assert(athleteHtml.includes("2.5000"), "Athlete page did not show fractional purchased shares");
    assert(athleteHtml.includes("Fractional trading from 0.01 shares"), "Athlete page did not expose fractional-share controls");
    assert(athleteHtml.includes("The chart changes only when the NexGame market engine actually reprices the athlete."), "Price-history behavior was not explained");
    assert(athleteHtml.includes("Market Cap"), "Athlete page did not show Market Cap");
    assert(athleteHtml.includes("Lifetime Performance Value"), "Athlete page did not define Market Cap as Lifetime Performance Value");
    assert(!athleteHtml.includes("NexGame Performance"), "Legacy score system is still visible on athlete page");

    await prisma.athlete.update({ where: { id: athlete.id }, data: { previousPrice: 10, currentPrice: 12 } });

    const sell = await postForm("/api/trade", {
      athleteId: athlete.id,
      side: "SELL",
      quantity: "0.75",
      returnTo: "/portfolio",
    }, cookie);
    assert(sell.status === 303, `Fractional sell expected 303, got ${sell.status}`);
    assert((sell.headers.get("location") || "").includes("trade=SELL"), "Sell redirect did not include success feedback");

    const qaUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    const [user, position, sellTrade] = await Promise.all([
      prisma.user.findUnique({ where: { email }, include: { wallet: true } }),
      prisma.position.findUnique({ where: { userId_athleteId: { userId: qaUser.id, athleteId: athlete.id } } }),
      prisma.trade.findFirst({ where: { athleteId: athlete.id, side: TradeSide.SELL }, orderBy: { createdAt: "desc" } }),
    ]);

    assert(user?.wallet, "M4 QA wallet missing");
    assert(Number(user.wallet.balance) === 4984, `Expected wallet N⟡4,984.00, got ${user.wallet.balance}`);
    assert(position, "Remaining position missing after fractional sell");
    assert(Number(position.quantity) === 1.75, `Expected 1.75 remaining shares, got ${position.quantity}`);
    assert(Number(position.averageCost) === 10, `Average cost changed after sell: ${position.averageCost}`);
    assert(sellTrade, "Sell trade missing");
    assert(Number(sellTrade.realizedPnl) === 1.5, `Expected realized P/L N⟡1.50, got ${sellTrade.realizedPnl}`);

    const portfolio = await fetch(`${baseUrl}/portfolio?trade=SELL`, { headers: { cookie } });
    const portfolioHtml = await portfolio.text();
    assert(portfolio.status === 200, "Portfolio failed after sell");
    assert(portfolioHtml.includes("Recent trades"), "Portfolio recent trade history missing");
    assert(portfolioHtml.includes("Shares"), "Portfolio did not use share terminology");
    assert(portfolioHtml.includes("Realized"), "Portfolio realized P/L summary missing");
    assert(portfolioHtml.includes("N⟡5,005.00"), "Portfolio value did not include fractional realized and unrealized gains");
    assert(portfolioHtml.includes("+N⟡5.00"), "Total P/L was not N⟡+5.00");

    const disabled = await prisma.athlete.update({ where: { id: athlete.id }, data: { marketEnabled: false } });
    assert(disabled.marketEnabled === false, "Failed to disable test athlete");
    const blocked = await postForm("/api/trade", {
      athleteId: athlete.id,
      side: "BUY",
      quantity: "0.25",
      returnTo: "/portfolio",
    }, cookie);
    assert(blocked.status === 303, "Disabled-athlete trade did not redirect safely");
    assert((blocked.headers.get("location") || "").includes("tradeError="), "Disabled-athlete trade did not surface an error");

    console.log("Milestone 4 live market + lifetime-performance market cap + fractional-share trading test: PASS");
  } finally {
    await prisma.trade.deleteMany({ where: { athleteId: athlete.id } });
    await prisma.position.deleteMany({ where: { athleteId: athlete.id } });
    await prisma.performanceValueEvent.deleteMany({ where: { athleteId: athlete.id } });
    await prisma.priceSnapshot.deleteMany({ where: { athleteId: athlete.id } });
    await prisma.athlete.delete({ where: { id: athlete.id } }).catch(() => undefined);
    await prisma.user.delete({ where: { email } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
