import { PrismaClient, Sport, TradeSide } from "@prisma/client";
import { calculateBoundedTargetPrice } from "../lib/live-pricing";

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
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded" };
  if (cookie) headers.cookie = cookie;
  return fetch(`${baseUrl}${path}`, { method: "POST", headers, body: new URLSearchParams(data), redirect: "manual" });
}

async function main() {
  assert(calculateBoundedTargetPrice(10, 20) === 11.2, "Upward live reprice did not respect 12% cap");
  assert(calculateBoundedTargetPrice(10, 2) === 8.8, "Downward live reprice did not respect 12% cap");
  assert(calculateBoundedTargetPrice(10, 10.5) === 10.5, "Live reprice did not move directly to nearby fair value");

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
      quantity: "2",
      returnTo: `/athletes/${slug}`,
    }, cookie);
    assert(buy.status === 303, `Buy expected 303, got ${buy.status}`);
    assert((buy.headers.get("location") || "").includes("trade=BUY"), "Buy redirect did not include success feedback");

    const athleteAfterBuy = await fetch(`${baseUrl}/athletes/${slug}?trade=BUY`, { headers: { cookie } });
    const athleteHtml = await athleteAfterBuy.text();
    assert(athleteAfterBuy.status === 200, "Athlete page failed after purchase");
    assert(athleteHtml.includes("You own"), "Athlete page did not show owned units");
    assert(athleteHtml.includes("2.0000"), "Athlete page did not show the purchased quantity");

    await prisma.athlete.update({ where: { id: athlete.id }, data: { previousPrice: 10, currentPrice: 12 } });

    const sell = await postForm("/api/trade", {
      athleteId: athlete.id,
      side: "SELL",
      quantity: "1",
      returnTo: "/portfolio",
    }, cookie);
    assert(sell.status === 303, `Sell expected 303, got ${sell.status}`);
    assert((sell.headers.get("location") || "").includes("trade=SELL"), "Sell redirect did not include success feedback");

    const [user, position, sellTrade] = await Promise.all([
      prisma.user.findUnique({ where: { email }, include: { wallet: true } }),
      prisma.position.findUnique({ where: { userId_athleteId: { userId: (await prisma.user.findUniqueOrThrow({ where: { email } })).id, athleteId: athlete.id } } }),
      prisma.trade.findFirst({ where: { athleteId: athlete.id, side: TradeSide.SELL }, orderBy: { createdAt: "desc" } }),
    ]);

    assert(user?.wallet, "M4 QA wallet missing");
    assert(Number(user.wallet.balance) === 4992, `Expected wallet N⟡4,992.00, got ${user.wallet.balance}`);
    assert(position, "Remaining position missing after partial sell");
    assert(Number(position.quantity) === 1, `Expected 1 remaining unit, got ${position.quantity}`);
    assert(Number(position.averageCost) === 10, `Average cost changed after sell: ${position.averageCost}`);
    assert(sellTrade, "Sell trade missing");
    assert(Number(sellTrade.realizedPnl) === 2, `Expected realized P/L N⟡2.00, got ${sellTrade.realizedPnl}`);

    const portfolio = await fetch(`${baseUrl}/portfolio?trade=SELL`, { headers: { cookie } });
    const portfolioHtml = await portfolio.text();
    assert(portfolio.status === 200, "Portfolio failed after sell");
    assert(portfolioHtml.includes("Recent trades"), "Portfolio recent trade history missing");
    assert(portfolioHtml.includes("Realized"), "Portfolio realized P/L summary missing");
    assert(portfolioHtml.includes("N⟡5,004.00"), "Portfolio value did not include realized and unrealized gains");
    assert(portfolioHtml.includes("+N⟡4.00"), "Total P/L was not N⟡+4.00");

    const disabled = await prisma.athlete.update({ where: { id: athlete.id }, data: { marketEnabled: false } });
    assert(disabled.marketEnabled === false, "Failed to disable test athlete");
    const blocked = await postForm("/api/trade", {
      athleteId: athlete.id,
      side: "BUY",
      quantity: "1",
      returnTo: "/portfolio",
    }, cookie);
    assert(blocked.status === 303, "Disabled-athlete trade did not redirect safely");
    assert((blocked.headers.get("location") || "").includes("tradeError="), "Disabled-athlete trade did not surface an error");

    console.log("Milestone 4 live market + trading test: PASS");
  } finally {
    await prisma.trade.deleteMany({ where: { athleteId: athlete.id } });
    await prisma.position.deleteMany({ where: { athleteId: athlete.id } });
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
