import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

function assert(condition, message) { if (!condition) throw new Error(message); }
async function postForm(path, data, cookie) {
  const headers = { "content-type": "application/x-www-form-urlencoded" };
  if (cookie) headers.cookie = cookie;
  return fetch(`${baseUrl}${path}`, { method: "POST", headers, body: new URLSearchParams(data), redirect: "manual" });
}
function assertTradeError(response, label) {
  assert(response.status === 303, `${label} expected safe redirect 303, got ${response.status}`);
  assert((response.headers.get("location") || "").includes("tradeError="), `${label} redirect did not include trade error feedback`);
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
  assert(marketHtml.includes("NexPoints balance"), "Authenticated market did not show NexPoints balance");
  assert(marketHtml.includes("N⟡5,000.00"), "New account did not start with 5,000 NexPoints");
  assert(marketHtml.includes("NBA") && marketHtml.includes("Athlete Market"), "NBA is not the default launch market");

  const athleteMatch = marketHtml.match(/name="athleteId" value="([^"]+)"/);
  assert(athleteMatch, "Could not find a tradeable NBA athlete in the market");
  const athleteId = athleteMatch[1];
  const tooSmall = await postForm("/api/trade", { athleteId, side: "BUY", quantity: "0.0001", returnTo: "/market" }, cookie);
  assertTradeError(tooSmall, "Sub-minimum trade");
  const overspend = await postForm("/api/trade", { athleteId, side: "BUY", quantity: "1000000", returnTo: "/market" }, cookie);
  assertTradeError(overspend, "Overspend");
  const buy = await postForm("/api/trade", { athleteId, side: "BUY", quantity: "1", returnTo: "/portfolio" }, cookie);
  assert(buy.status === 303, `Buy expected 303, got ${buy.status}`);
  assert((buy.headers.get("location") || "").includes("trade=BUY"), "Buy redirect did not include success status");
  const portfolioAfterBuy = await fetch(`${baseUrl}/portfolio`, { headers: { cookie } });
  const portfolioHtml = await portfolioAfterBuy.text();
  assert(portfolioAfterBuy.status === 200, `Portfolio expected 200, got ${portfolioAfterBuy.status}`);
  assert(!portfolioHtml.includes("No holdings yet"), "Purchased athlete did not appear in portfolio");
  assert(portfolioHtml.includes("Unrealized P/L"), "Portfolio did not render P/L");
  const oversell = await postForm("/api/trade", { athleteId, side: "SELL", quantity: "2", returnTo: "/portfolio" }, cookie);
  assertTradeError(oversell, "Oversell");
  const sell = await postForm("/api/trade", { athleteId, side: "SELL", quantity: "1", returnTo: "/portfolio" }, cookie);
  assert(sell.status === 303, `Sell expected 303, got ${sell.status}`);
  assert((sell.headers.get("location") || "").includes("trade=SELL"), "Sell redirect did not include success status");

  const user = await prisma.user.findUnique({ where: { email }, include: { wallet: true, positions: true, trades: true, ledger: true } });
  assert(user, "QA user not found in database");
  assert(Number(user.wallet?.balance) === 5000, `Expected ending balance 5000, got ${user.wallet?.balance}`);
  assert(user.positions.length === 0, `Expected zero positions after full sell, got ${user.positions.length}`);
  assert(user.trades.length === 2, `Expected 2 successful trades, got ${user.trades.length}`);
  assert(user.ledger.length === 3, `Expected signup + buy + sell ledger entries, got ${user.ledger.length}`);
  const logout = await postForm("/api/auth/logout", {}, cookie);
  assert(logout.status === 303, `Logout expected 303, got ${logout.status}`);
  console.log("Milestone 1 smoke test: PASS");
} finally { await prisma.$disconnect(); }
