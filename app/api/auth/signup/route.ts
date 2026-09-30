import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { startOfCurrentWeekUtc } from "@/lib/competition";
import { publicRequestUrl } from "@/lib/public-url";

const STARTING_NEXPOINTS = 5000;
const schema = z.object({ username: z.string().min(3).max(24), email: z.string().email(), password: z.string().min(8).max(128) });

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.redirect(publicRequestUrl(req, "/signup?error=invalid"), 303);

  const { username, email, password } = parsed.data;
  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (exists) return NextResponse.redirect(publicRequestUrl(req, "/signup?error=exists"), 303);

  const passwordHash = await bcrypt.hash(password, 12);
  const weekStart = startOfCurrentWeekUtc();
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, username, passwordHash, wallet: { create: { balance: STARTING_NEXPOINTS } } } });
    await tx.ledgerEntry.create({ data: { userId: created.id, type: "SIGNUP_CREDIT", amount: STARTING_NEXPOINTS, balance: STARTING_NEXPOINTS, reference: "initial-nexpoints-bankroll" } });
    await tx.weeklyPortfolioBaseline.create({ data: { userId: created.id, weekStart, startValue: STARTING_NEXPOINTS } });
    return created;
  });

  await createSession(user.id);
  return NextResponse.redirect(publicRequestUrl(req, "/market?auth=signup"), 303);
}
