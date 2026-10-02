import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function safeReturnTo(value: unknown, fallback = "/market") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/[\\\r\n]/.test(value) ? value : fallback;
}

// Persistent counters work across application instances; hashes avoid storing IP/email.
export async function consumeRateLimit(scope: string, subject: string, limit: number, seconds = 60, now = new Date()) {
  const key = crypto.createHash("sha256").update(`${scope}:${subject}`).digest("hex");
  const windowStart = new Date(Math.floor(now.getTime() / (seconds * 1000)) * seconds * 1000);
  const row = await prisma.rateLimitWindow.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  return row.count <= limit;
}

export function requestSource(req: Request) {
  // Enable only when the hosting proxy replaces this header.
  return process.env.TRUST_PROXY_IP === "1" ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "shared";
}
