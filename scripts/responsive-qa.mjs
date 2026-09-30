import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import fs from "node:fs/promises";

if (process.env.FOUNDATION4_TEST_DATABASE !== "1") throw new Error("Responsive QA requires an isolated acceptance-test database.");
const prisma = new PrismaClient();
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const userId = "foundation4-test-admin";
let browser;
try {
  await prisma.user.create({ data: { id: userId, username: "responsive_qa", email: "responsive@example.test", passwordHash: "isolated-test-only", wallet: { create: { balance: 5000 } } } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({ data: { userId, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: "nax_session", value: token, url: base }]);
  const page = await context.newPage();
  await fs.mkdir("qa-output", { recursive: true });
  const athlete = await prisma.athlete.findFirstOrThrow({ where: { active: true, marketEnabled: true } });
  let scoutToken;
  let testRoute;
  if (process.env.REAL_MARKET_CUSTOMER_TEST === "1") {
    const tester = await prisma.user.findUniqueOrThrow({ where: { email: "scout_buyer@example.test" } });
    scoutToken = crypto.randomBytes(32).toString("hex");
    await prisma.session.create({ data: { userId: tester.id, tokenHash: crypto.createHash("sha256").update(scoutToken).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
    const testPosition = await prisma.scoutPosition.findFirstOrThrow({ where: { userId: tester.id, quantity: { gt: 0 } } });
    testRoute = "/real-market/test?athlete=" + testPosition.athleteId;
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/tutorial", "/real-market", "/market", "/portfolio", "/admin", "/real-market/verify", "/athletes/" + athlete.slug, ...(testRoute ? [testRoute] : [])]) {
      await context.addCookies([{ name: "nax_session", value: route === testRoute ? scoutToken : token, url: base }]);
      const response = await page.goto(base + route);
      if (response?.status() !== 200) throw new Error("Could not load " + route);
      await page.locator("main h1").waitFor({ state: "visible" });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) throw new Error("Page overflow at " + width + "px on " + route);
      await page.screenshot({ path: "qa-output/" + route.split("?")[0].replaceAll("/", "_") + "-" + width + ".png", fullPage: true });
      if (route === testRoute) {
        const orderCount = await prisma.scoutOrder.count();
        await page.getByRole("tab", { name: "Sell", exact: true }).click();
        if (await page.locator('input[name="side"]').getAttribute("value") !== "SELL") throw new Error("Sell tab did not update the order side.");
        await page.getByRole("tab", { name: "Buy", exact: true }).click();
        await page.getByRole("button", { name: "Review order", exact: true }).click();
        await page.getByRole("button", { name: "Place limit buy", exact: true }).waitFor({ state: "visible" });
        if (await prisma.scoutOrder.count() !== orderCount) throw new Error("Reviewing an order submitted it before confirmation.");
        if (await page.getByLabel("Limit price", { exact: true }).getAttribute("readonly") === null) throw new Error("Reviewed limit price is still editable.");
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error("Order review overflowed at " + width);
        await page.screenshot({ path: "qa-output/customer-order-review-" + width + ".png", fullPage: true });
        await page.getByRole("button", { name: "Edit order", exact: true }).click();
        await page.getByRole("button", { name: "Review order", exact: true }).waitFor({ state: "visible" });
        await page.getByRole("button", { name: "ALL", exact: true }).click();
        if (await page.getByRole("button", { name: "ALL", exact: true }).getAttribute("aria-pressed") !== "true") throw new Error("Chart range did not update.");
        if (width < 1000 && !(await page.getByLabel("Trade an athlete collectible", { exact: true }).isVisible())) throw new Error("Mobile athlete collectible picker is unavailable.");
      }
    }
  }
  console.log("Desktop/mobile responsive QA: PASS");
} finally {
  await browser?.close();
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
