import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { applyAdminAction } from "../lib/admin";
import { beginSandboxEnrollment, reserveRewardClaim, reviewSandboxIdentity } from "../lib/identity";
import { consumeRateLimit, safeReturnTo } from "../lib/request-security";
import { executeTrade } from "../lib/trading";
import { executeSandboxRealTrade, simulateSandboxFunding } from "../lib/real-market-sandbox";
import { requestPasswordRecovery, resetPassword } from "../lib/password-recovery";
import { loadWeeklyLeaderboard } from "../lib/competition";
import { realMarket } from "../lib/real-market";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const unique = Date.now();
const adminId = "foundation4-test-admin";
const password = "Foundation4-Password!";
const accountIds: string[] = [];

async function post(path: string, body: Record<string, string>, cookie = "", origin = new URL(base).origin) {
  return fetch(`${base}${path}`, { method: "POST", headers: { origin, cookie, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), redirect: "manual" });
}
async function main() {
  if (process.env.FOUNDATION4_TEST_DATABASE !== "1") throw new Error("Run this acceptance test only against an isolated database with FOUNDATION4_TEST_DATABASE=1.");
  process.env.ADMIN_USER_IDS = adminId;
  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({ data: { id: adminId, username: `f4admin${unique}`, email: `f4admin${unique}@example.test`, passwordHash: hash, wallet: { create: { balance: 5000 } } } });
  accountIds.push(admin.id);
  const accounts = [];
  for (let i = 0; i < 2; i++) {
    const response = await post("/api/auth/signup", { username: `f4${i}${unique}`, email: `f4${i}${unique}@example.test`, password });
    assert.equal(response.status, 303);
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie, "Multiple Free Market accounts should be allowed.");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: `f4${i}${unique}@example.test` } });
    accounts.push({ ...user, cookie });
    accountIds.push(user.id);
  }
  const [first, second] = accounts;
  const athlete = await prisma.athlete.findFirstOrThrow({ where: { marketEnabled: true, active: true, currentPrice: { gt: 5, lt: 1000 } } });
  assert.equal((await fetch(`${base}/admin`, { headers: { cookie: first.cookie }, redirect: "manual" })).status, 404, "Regular users must not read the admin console.");
  assert.equal((await post("/api/admin/actions", { action: "FREEZE", targetId: second.id, reason: "Unauthorized test" }, first.cookie)).status, 403);
  assert.equal((await post("/api/trade", {}, first.cookie, "https://attacker.example")).status, 403, "Cross-origin mutations must be blocked.");
  assert.equal(safeReturnTo("/\\attacker.example"), "/market");
  assert.equal(safeReturnTo("//attacker.example"), "/market");
  const requestKey = crypto.randomUUID();
  const tradeBody = { athleteId: athlete.id, side: "BUY", quantity: "1", requestKey, returnTo: "/portfolio" };
  assert.ok((await post("/api/trade", tradeBody, first.cookie)).headers.get("location")?.includes("trade=BUY"));
  assert.ok((await post("/api/trade", tradeBody, first.cookie)).headers.get("location")?.includes("trade=BUY"));
  assert.equal(await prisma.trade.count({ where: { userId: first.id } }), 1, "A replay must not execute another trade.");
  await assert.rejects(executeTrade(first.id, athlete.id, "SELL", 1, requestKey), /already used/);
  await assert.rejects(simulateSandboxFunding(first.id, "DEPOSIT", "BANK", 100), /verification/);
  await beginSandboxEnrollment(first.id);
  await beginSandboxEnrollment(second.id);
  await reviewSandboxIdentity(admin.id, first.id, "VERIFIED", `person_${unique}`, "Acceptance identity review");
  await assert.rejects(reviewSandboxIdentity(admin.id, second.id, "VERIFIED", `person_${unique}`, "Duplicate identity review"), /already belongs/);
  assert.equal((await prisma.realEnrollment.findUniqueOrThrow({ where: { userId: second.id } })).status, "PENDING");
  await reserveRewardClaim(admin.id, first.id, `beta_${unique}`, "Acceptance reward reservation");
  await assert.rejects(reserveRewardClaim(admin.id, first.id, `beta_${unique}`, "Duplicate reward reservation"));
  assert.equal(await prisma.rewardClaim.count({ where: { userId: first.id } }), 1);
  await simulateSandboxFunding(first.id, "DEPOSIT", "BANK", 500);
  await executeSandboxRealTrade(first.id, athlete.id, "BUY", 1);
  await assert.rejects(simulateSandboxFunding(first.id, "WITHDRAWAL", "DEBIT_CARD", 1), /not supported/);
  await applyAdminAction(admin.id, "PAUSE_FREE", "global", "Acceptance global market pause");
  await assert.rejects(executeTrade(first.id, athlete.id, "BUY", 1), /paused/);
  await applyAdminAction(admin.id, "RESUME_FREE", "global", "Acceptance global market resume");
  await applyAdminAction(admin.id, "PAUSE_SANDBOX", "global", "Acceptance sandbox pause");
  await assert.rejects(simulateSandboxFunding(first.id, "DEPOSIT", "BANK", 1), /paused/);
  await applyAdminAction(admin.id, "RESUME_SANDBOX", "global", "Acceptance sandbox resume");
  await applyAdminAction(admin.id, "HALT_ATHLETE", athlete.id, "Acceptance athlete halt");
  await assert.rejects(executeTrade(first.id, athlete.id, "BUY", 1), /not available/);
  await applyAdminAction(admin.id, "RESUME_ATHLETE", athlete.id, "Acceptance athlete resume");
  await applyAdminAction(admin.id, "EXCLUDE_LEADERBOARD", first.id, "Acceptance leaderboard exclusion");
  assert.ok(!(await loadWeeklyLeaderboard()).some((entry) => entry.userId === first.id));
  await applyAdminAction(admin.id, "FREEZE", first.id, "Acceptance account freeze");
  assert.equal(await prisma.session.count({ where: { userId: first.id } }), 0);
  await assert.rejects(executeTrade(first.id, athlete.id, "BUY", 1), /account is paused/);
  await assert.rejects(executeSandboxRealTrade(first.id, athlete.id, "BUY", 1), /account is paused/);
  await applyAdminAction(admin.id, "UNFREEZE", first.id, "Acceptance account unfreeze");
  await reviewSandboxIdentity(admin.id, first.id, "REJECTED", "", "Acceptance identity revocation");
  await assert.rejects(simulateSandboxFunding(first.id, "DEPOSIT", "BANK", 1), /verification/);
  await assert.rejects(reviewSandboxIdentity(admin.id, second.id, "VERIFIED", `person_${unique}`, "Rejected identity must remain reserved"), /already belongs/);
  const rateSubject = `rate_${unique}`;
  const rateResults = await Promise.all(Array.from({ length: 12 }, () => consumeRateLimit("test", rateSubject, 5, 3600, new Date("2026-01-01T00:01:00Z"))));
  assert.equal(rateResults.filter(Boolean).length, 5, "Concurrent rate increments must not exceed allowance.");
  let receivedUrl = "";
  const mail = http.createServer((req, res) => {
    let body = "";
    req.on("data", (part) => { body += part; });
    req.on("end", () => { receivedUrl = JSON.parse(body).resetUrl; res.end("ok"); });
  });
  await new Promise<void>((resolve) => mail.listen(0, "127.0.0.1", resolve));
  const address = mail.address();
  assert.ok(address && typeof address !== "string");
  process.env.AUTH_EMAIL_WEBHOOK_URL = `http://127.0.0.1:${address.port}`;
  process.env.AUTH_EMAIL_WEBHOOK_TOKEN = "test-only-email-secret";
  process.env.APP_ORIGIN = base;
  try {
    await requestPasswordRecovery(second.email);
    const token = new URL(receivedUrl).searchParams.get("token")!;
    const stored = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: second.id } });
    assert.notEqual(stored.tokenHash, token, "Store only the reset-token hash.");
    await resetPassword(token, "New-Foundation4-Password!");
    await assert.rejects(resetPassword(token, "New-Foundation4-Password!"), /already been used/);
    assert.equal(await prisma.session.count({ where: { userId: second.id } }), 0);
    assert.ok(await bcrypt.compare("New-Foundation4-Password!", (await prisma.user.findUniqueOrThrow({ where: { id: second.id } })).passwordHash));
  } finally { await new Promise<void>((resolve) => mail.close(() => resolve())); }
  const adminLogin = await post("/api/auth/login", { email: admin.email, password });
  const adminCookie = adminLogin.headers.get("set-cookie")?.split(";")[0];
  assert.ok(adminCookie);
  const adminPage = await fetch(`${base}/admin`, { headers: { cookie: adminCookie } });
  assert.equal(adminPage.status, 200);
  assert.ok((await adminPage.text()).includes("Audit log"));
  assert.ok(await prisma.adminAuditEvent.count({ where: { actorId: admin.id } }) >= 10);
  assert.equal(realMarket.liveFundsEnabled, false);
  assert.equal(await prisma.realWallet.count({ where: { environment: "LIVE" } }), 0);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  console.log("Foundation 4 acceptance: PASS (accounts, authorization, CSRF, replay protection, KYC, rewards, freezes, pauses, recovery, rate limits, audit, live-funds boundary).");
}
main().finally(async () => {
  await prisma.rewardClaim.deleteMany({ where: { userId: { in: accountIds } } });
  await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
}).catch((error) => { console.error(error); process.exitCode = 1; });
