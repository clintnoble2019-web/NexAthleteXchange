import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { beginSandboxEnrollment } from "@/lib/identity";
import { realMarketSandboxPreviewEnabled } from "@/lib/real-market";
import { consumeRateLimit, requestSource } from "@/lib/request-security";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { startOfCurrentWeekUtc } from "@/lib/competition";
import { publicRequestUrl } from "@/lib/public-url";

const STARTING_NEXPOINTS = 5000;
const schema = z.object({ username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/), email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128) });

export async function POST(req: Request) {
  if (!(await consumeRateLimit("signup-source", requestSource(req), process.env.TRUST_PROXY_IP === "1" ? 20 : 1000, 3600))) return NextResponse.redirect(publicRequestUrl(req, "/signup?error=rate"), 303);
  const form = await req.formData();
  const realSignup = form.get("market") === "REAL";
  if (realSignup && !realMarketSandboxPreviewEnabled()) return NextResponse.redirect(publicRequestUrl(req, "/real-market"), 303);
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.redirect(publicRequestUrl(req, "/signup?error=invalid"), 303);

  const { username, email, password } = parsed.data;
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: { equals: email, mode: "insensitive" } }, { username: { equals: username, mode: "insensitive" } }] } });
  if (exists) return NextResponse.redirect(publicRequestUrl(req, "/signup?error=exists"), 303);

  const passwordHash = await bcrypt.hash(password, 12);
  const weekStart = startOfCurrentWeekUtc();
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, username, passwordHash, wallet: { create: { balance: STARTING_NEXPOINTS } } } });
      await tx.ledgerEntry.create({ data: { userId: created.id, type: "SIGNUP_CREDIT", amount: STARTING_NEXPOINTS, balance: STARTING_NEXPOINTS, reference: "initial-nexpoints-bankroll" } });
      await tx.weeklyPortfolioBaseline.create({ data: { userId: created.id, weekStart, startValue: STARTING_NEXPOINTS } });
      return created;
    });

    await createSession(user.id);
    if (realSignup) {
      await beginSandboxEnrollment(user.id);
      return NextResponse.redirect(publicRequestUrl(req, "/real-market/verify"), 303);
    }
    return NextResponse.redirect(publicRequestUrl(req, "/market?auth=signup"), 303);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.redirect(publicRequestUrl(req, "/signup?error=exists"), 303);
    throw error;
  }
}
