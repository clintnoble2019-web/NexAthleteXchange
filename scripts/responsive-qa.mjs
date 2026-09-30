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
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/market", "/portfolio", "/admin", "/real-market/verify", "/athletes/" + athlete.slug]) {
      const response = await page.goto(base + route);
      if (response?.status() !== 200) throw new Error("Could not load " + route);
      await page.locator("main h1").waitFor({ state: "visible" });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) throw new Error("Page overflow at " + width + "px on " + route);
      await page.screenshot({ path: "qa-output/" + route.replaceAll("/", "_") + "-" + width + ".png", fullPage: true });
    }
  }
  console.log("Desktop/mobile responsive QA: PASS");
} finally {
  await browser?.close();
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
