import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function postForm(path, data, cookie) {
  const headers = { "content-type": "application/x-www-form-urlencoded" };
  if (cookie) headers.cookie = cookie;
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(data),
    redirect: "manual"
  });
}

const unique = Date.now();
const email = `qa-${unique}@nexathletexchange.test`;
const username = `qa${String(unique).slice(-8)}`;
const password = "Milestone1-Test-Password!";

try {
  const signup = await postForm("/api/auth/signup", { username, email, password });
  assert(signup.status === 303, `Signup expected 303, got ${signup.status}`);

  const setCookie = signup.headers.get("set-cookie");
  assert(setCookie, "Signup did not return a session cookie");
  const cookie = setCookie.split(";")[0];

  const market = await fetch(`${baseUrl}/market`, { headers: { cookie } });
  assert(market.status === 200, `Market expected 200, got ${market.status}`);
  const marketHtml = await market.text();
  assert(marketHtml.includes("Virtual cash"), "Authenticated market did not show virtual cash");
  assert(marketHtml.includes("100,000.00"), "New account did not start with $100,000 virtual cash");

  const athleteMatch = marketHtml.match(/name="athleteId" value="([^"]+)"/);
  assert(athleteMatch, "Could not find a tradeable MLB athlete in the market");
  const athleteId = athleteMatch[1];

  const tooSmall = await postForm("/api/trade", {
    athleteId,
    side: "BUY",
    quantity: "0.0001",
    returnTo: "/market"
  }, cookie);
  assert(tooSmall.status === 400, `Sub-minimum trade expected 400, got ${tooSmall.status}`);

  const overspend = await postForm("/api/trade", {
    athleteId,
    side: "BUY",
    quantity: "1000000",
    returnTo: "/market"
  }, cookie);
  assert(overspend.status === 400, `Overspend expected 400, got ${overspend.status}`);

  const buy = await postForm("/api/trade", {
    athleteId,
    side: "BUY",
    quantity: "1",
    returnTo: "/portfolio"
  }, cookie);
  assert(buy.status === 303, `Buy expected 303, got ${buy.status}`);

  const portfolioAfterBuy = await fetch(`${baseUrl}/portfolio`, { headers: { cookie } });
  assert(portfolioAfterBuy.status === 200, `Portfolio expected 200, got ${portfolioAfterBuy.status}`);
  const portfolioHtml = await portfolioAfterBuy.text();
  assert(!portfolioHtml.includes("No holdings yet"), "Purchased athlete did not appear in portfolio");
  assert(portfolioHtml.includes("Unrealized P/L"), "Portfolio did not render P/L");

  const oversell = await postForm("/api/trade", {
    athleteId,
    side: "SELL",
    quantity: "2",
    returnTo: "/portfolio"
  }, cookie);
  assert(oversell.status === 400, `Oversell expected 400, got ${oversell.status}`);

  const sell = await postForm("/api/trade", {
    athleteId,
    side: "SELL",
    quantity: "1",
    returnTo: "/portfolio"
  }, cookie);
  assert(sell.status === 303, `Sell expected 303, got ${sell.status}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { wallet: true, positions: true, trades: true, ledger: true }
  });

  assert(user, "QA user not found in database");
  assert(Number(user.wallet?.balance) === 100000, `Expected ending balance 100000, got ${user.wallet?.balance}`);
  assert(user.positions.length === 0, `Expected zero positions after full sell, got ${user.positions.length}`);
  assert(user.trades.length === 2, `Expected 2 successful trades, got ${user.trades.length}`);
  assert(user.ledger.length === 3, `Expected signup + buy + sell ledger entries, got ${user.ledger.length}`);
  assert(user.ledger.some((entry) => entry.type === "SIGNUP_CREDIT"), "Missing signup credit ledger entry");
  assert(user.ledger.some((entry) => entry.type === "TRADE_BUY"), "Missing buy ledger entry");
  assert(user.ledger.some((entry) => entry.type === "TRADE_SELL"), "Missing sell ledger entry");

  const logout = await postForm("/api/auth/logout", {}, cookie);
  assert(logout.status === 303, `Logout expected 303, got ${logout.status}`);

  console.log("Milestone 1 smoke test: PASS");
} finally {
  await prisma.$disconnect();
}
