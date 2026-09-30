import { PrismaClient, Sport } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const unique = Date.now();
const prefix = `M3 QA ${unique}`;
const slugPrefix = `m3-qa-${unique}-`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function renderedText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#x27;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function get(path: string, cookie?: string) {
  return fetch(`${baseUrl}${path}`, { headers: cookie ? { cookie } : undefined, redirect: "manual" });
}

async function postForm(path: string, data: Record<string, string>, cookie?: string) {
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded" };
  if (cookie) headers.cookie = cookie;
  return fetch(`${baseUrl}${path}`, { method: "POST", headers, body: new URLSearchParams(data), redirect: "manual" });
}

async function main() {
  try {
    await prisma.athlete.createMany({
      data: Array.from({ length: 30 }, (_, index) => ({
        name: `${prefix} Player ${String(index).padStart(2, "0")}`,
        slug: `${slugPrefix}${String(index).padStart(2, "0")}`,
        sport: Sport.NBA,
        league: "NBA",
        team: index % 2 === 0 ? "DEN" : "BOS",
        position: index % 2 === 0 ? "G" : "F",
        currentPrice: 5 + index,
        previousPrice: 5 + index,
        performance: 20 + index,
        active: true,
        marketEnabled: true,
      })),
    });

    const signup = await postForm("/api/auth/signup", {
      username: `m3qa${String(unique).slice(-8)}`,
      email: `m3-${unique}@nexathletexchange.test`,
      password: "Milestone3-Test-Password!",
    });
    assert(signup.status === 303, `Signup expected 303, got ${signup.status}`);
    const setCookie = signup.headers.get("set-cookie");
    assert(setCookie, "Signup did not return a session cookie");
    const cookie = setCookie.split(";")[0];

    const defaultPage = await get(`/market?sport=NBA&q=${encodeURIComponent(prefix)}`);
    assert(defaultPage.status === 200, `NBA filtered market expected 200, got ${defaultPage.status}`);
    const defaultHtml = await defaultPage.text();
    const defaultText = renderedText(defaultHtml);
    assert(defaultText.includes("30 players"), "Filtered market did not report 30 QA players");
    assert(defaultText.includes("Showing 1–25"), "Default market page size is not 25");
    assert(defaultText.includes(`${prefix} Player 29`), "Default performance sort did not include top QA player");
    assert(!defaultText.includes(`${prefix} Player 00`), "Default first page leaked a second-page QA player");
    assert(defaultText.includes("Next →"), "Pagination next control missing");

    const secondPage = await get(`/market?sport=NBA&q=${encodeURIComponent(prefix)}&sort=name&perPage=25&page=2`);
    const secondText = renderedText(await secondPage.text());
    assert(secondPage.status === 200, "Second market page expected 200");
    assert(secondText.includes("Page 2 of 2"), "Page 2 status missing");
    assert(secondText.includes(`${prefix} Player 25`), "Second page missing expected player");
    assert(!secondText.includes(`${prefix} Player 00`), "Second page included first-page player");

    const clampedPage = await get(`/market?sport=NBA&q=${encodeURIComponent(prefix)}&sort=name&perPage=25&page=999`);
    const clampedText = renderedText(await clampedPage.text());
    assert(clampedText.includes("Page 2 of 2"), "Out-of-range page was not clamped");

    const search = await get(`/market?sport=NBA&q=${encodeURIComponent(`${prefix} Player 07`)}`);
    const searchText = renderedText(await search.text());
    assert(searchText.includes(`${prefix} Player 07`), "Player search missed exact QA player");
    assert(!searchText.includes(`${prefix} Player 08`), "Player search returned unrelated QA player");

    const team = await get(`/market?sport=NBA&team=DEN&q=${encodeURIComponent(prefix)}&sort=name&perPage=100`);
    const teamText = renderedText(await team.text());
    assert(teamText.includes(`${prefix} Player 00`), "Team filter missed DEN QA player");
    assert(!teamText.includes(`${prefix} Player 01`), "Team filter included BOS QA player");

    const position = await get(`/market?sport=NBA&position=F&q=${encodeURIComponent(prefix)}&sort=name&perPage=100`);
    const positionText = renderedText(await position.text());
    assert(positionText.includes(`${prefix} Player 01`), "Position filter missed F QA player");
    assert(!positionText.includes(`${prefix} Player 00`), "Position filter included G QA player");

    const priceDesc = await get(`/market?sport=NBA&q=${encodeURIComponent(prefix)}&sort=price_desc&perPage=100`);
    const priceDescText = renderedText(await priceDesc.text());
    assert(priceDescText.indexOf(`${prefix} Player 29`) < priceDescText.indexOf(`${prefix} Player 28`), "Highest-price sort order is incorrect");

    const priceAsc = await get(`/market?sport=NBA&q=${encodeURIComponent(prefix)}&sort=price_asc&perPage=100`);
    const priceAscText = renderedText(await priceAsc.text());
    assert(priceAscText.indexOf(`${prefix} Player 00`) < priceAscText.indexOf(`${prefix} Player 01`), "Lowest-price sort order is incorrect");

    const nameSort = await get(`/market?sport=NBA&q=${encodeURIComponent(prefix)}&sort=name&perPage=100`);
    const nameSortText = renderedText(await nameSort.text());
    assert(nameSortText.indexOf(`${prefix} Player 00`) < nameSortText.indexOf(`${prefix} Player 01`), "A-Z sort order is incorrect");

    const empty = await get(`/market?sport=NBA&q=${encodeURIComponent(`missing-${unique}`)}`);
    const emptyText = renderedText(await empty.text());
    assert(emptyText.includes("No players match these filters."), "Empty-filter state missing");

    const mlbSearch = await get("/market?sport=MLB&q=Shohei");
    const mlbSearchText = renderedText(await mlbSearch.text());
    assert(mlbSearchText.includes("Shohei Ohtani"), "MLB search did not find Shohei Ohtani");

    const mlbTeam = await get("/market?sport=MLB&team=LAD");
    const mlbTeamText = renderedText(await mlbTeam.text());
    assert(mlbTeamText.includes("Shohei Ohtani"), "MLB team filter missed Dodgers player");
    assert(!mlbTeamText.includes("Aaron Judge"), "MLB team filter included Yankees player");

    const preserved = await get(`/market?sport=NBA&team=DEN&q=${encodeURIComponent(prefix)}&position=G&sort=name&perPage=25`, cookie);
    const preservedHtml = await preserved.text();
    const returnMatch = preservedHtml.match(/name="returnTo" value="([^"]+)"/);
    assert(returnMatch, "Authenticated market did not render trade return path");
    const returnTo = returnMatch[1].replaceAll("&amp;", "&");
    const returnUrl = new URL(returnTo, baseUrl);
    assert(returnUrl.searchParams.get("sport") === "NBA", "Trade return path lost sport filter");
    assert(returnUrl.searchParams.get("team") === "DEN", "Trade return path lost team filter");
    assert(returnUrl.searchParams.get("q") === prefix, "Trade return path lost search filter");
    assert(returnUrl.searchParams.get("position") === "G", "Trade return path lost position filter");
    assert(returnUrl.searchParams.get("sort") === "name", "Trade return path lost sort filter");
    assert(returnUrl.searchParams.get("perPage") === "25", "Trade return path lost page-size filter");

    console.log("Milestone 3 market navigation test: PASS");
  } finally {
    await prisma.athlete.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
