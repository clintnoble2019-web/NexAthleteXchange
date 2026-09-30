const baseUrl = process.env.MARKET_TICK_URL;
const secret = process.env.MARKET_CRON_SECRET;
const mode = process.env.MARKET_TICK_MODE || "live";

if (!baseUrl) throw new Error("MARKET_TICK_URL is not configured");
if (!secret) throw new Error("MARKET_CRON_SECRET is not configured");
if (!['live', 'baseline'].includes(mode)) throw new Error(`Unsupported MARKET_TICK_MODE: ${mode}`);

const url = new URL(baseUrl);
url.searchParams.set("mode", mode);

const response = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await response.text();
if (!response.ok) {
  throw new Error(`Market tick failed (${response.status}): ${body}`);
}

console.log(body);
