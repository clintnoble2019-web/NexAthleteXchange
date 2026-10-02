import { PrismaClient, Sport } from "@prisma/client";
import { startOfCurrentWeekUtc } from "../lib/competition";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const unique = Date.now();
const email = `m5-${unique}@nexathletexchange.test`;
const username = `scout${String(unique).slice(-8)}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function postForm(path: string, data: Record<string, string>, cookie?: string) {
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", origin: new URL(baseUrl).origin };
  if (cookie) headers.cookie = cookie;
  return fetch(`${baseUrl}${path}`, { method: "POST", headers, body: new URLSearchParams(path === "/api/trade" ? { ...data, requestKey: crypto.randomUUID() } : data), redirect: "manual" });
}

async function get(path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return fetch(`${baseUrl}${path}`, { headers, redirect: "manual" });
}

async function main() {
  const athlete = await prisma.athlete.findFirstOrThrow({
    where: { sport: Sport.NBA, active: true, marketEnabled: true },
    orderBy: { name: "asc" },
  });

  try {
    const signup = await postForm("/api/auth/signup", {
      username,
      email,
      password: "Milestone5-Test-Password!",
    });
    assert(signup.status === 303, `Signup expected 303, got ${signup.status}`);
    const setCookie = signup.headers.get("set-cookie");
    assert(setCookie, "Signup did not return a session cookie");
    const cookie = setCookie.split(";")[0];

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const baseline = await prisma.weeklyPortfolioBaseline.findUnique({
      where: { userId_weekStart: { userId: user.id, weekStart: startOfCurrentWeekUtc() } },
    });
    assert(baseline, "Signup did not enroll user in current weekly competition");
    assert(Number(baseline.startValue) === 5000, `Expected N⟡5,000 weekly baseline, got ${baseline.startValue}`);

    const discover = await get("/discover?sport=NBA", cookie);
    const discoverHtml = await discover.text();
    assert(discover.status === 200, `Discover expected 200, got ${discover.status}`);
    assert(discoverHtml.includes("Find the breakout first"), "Discover scouting headline missing");
    assert(discoverHtml.includes("Trending"), "Discover trending board missing");
    assert(discoverHtml.includes("Value watch"), "Discover value watch board missing");
    assert(discoverHtml.includes("Live market"), "Discover auto-refresh status missing");

    const watch = await postForm("/api/watchlist", { athleteId: athlete.id, returnTo: "/watchlist" }, cookie);
    assert(watch.status === 303, `Watchlist toggle expected 303, got ${watch.status}`);
    const entry = await prisma.watchlistEntry.findUnique({ where: { userId_athleteId: { userId: user.id, athleteId: athlete.id } } });
    assert(entry, "Watchlist entry was not created");

    const watchlist = await get("/watchlist", cookie);
    const watchlistHtml = await watchlist.text();
    assert(watchlist.status === 200, `Watchlist expected 200, got ${watchlist.status}`);
    assert(watchlistHtml.includes("My Watchlist"), "Watchlist heading missing");
    assert(watchlistHtml.includes(athlete.name), "Watched athlete missing from watchlist");

    const athletePage = await get(`/athletes/${athlete.slug}`, cookie);
    const athleteHtml = await athletePage.text();
    assert(athletePage.status === 200, `Athlete page expected 200, got ${athletePage.status}`);
    assert(athleteHtml.includes("Watching"), "Athlete page did not reflect watchlist state");
    assert(athleteHtml.includes("Live market"), "Athlete page auto-refresh status missing");

    const leaderboard = await get("/leaderboard", cookie);
    const leaderboardHtml = await leaderboard.text();
    assert(leaderboard.status === 200, `Leaderboard expected 200, got ${leaderboard.status}`);
    assert(leaderboardHtml.includes("Scout Leaderboard"), "Weekly scout leaderboard heading missing");
    assert(leaderboardHtml.includes(username), "Signed-up trader missing from leaderboard");

    const profile = await get(`/traders/${username}`, cookie);
    const profileHtml = await profile.text();
    assert(profile.status === 200, `Trader profile expected 200, got ${profile.status}`);
    assert(profileHtml.includes("TRADER PROFILE"), "Trader profile label missing");
    assert(profileHtml.includes(username), "Trader profile username missing");

    const portfolio = await get("/portfolio", cookie);
    const portfolioHtml = await portfolio.text();
    assert(portfolio.status === 200, `Portfolio expected 200, got ${portfolio.status}`);
    assert(portfolioHtml.includes("Today&#x27;s holding move") || portfolioHtml.includes("Today&apos;s holding move") || portfolioHtml.includes("Today's holding move"), "Daily portfolio feedback missing");
    assert(portfolioHtml.includes("View public trader profile"), "Portfolio profile link missing");

    const unwatch = await postForm("/api/watchlist", { athleteId: athlete.id, returnTo: "/watchlist" }, cookie);
    assert(unwatch.status === 303, `Watchlist removal expected 303, got ${unwatch.status}`);
    const removed = await prisma.watchlistEntry.findUnique({ where: { userId_athleteId: { userId: user.id, athleteId: athlete.id } } });
    assert(!removed, "Watchlist entry was not removed on second toggle");

    console.log("Milestone 5 competition + scouting + live experience test: PASS");
  } finally {
    await prisma.user.delete({ where: { email } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
