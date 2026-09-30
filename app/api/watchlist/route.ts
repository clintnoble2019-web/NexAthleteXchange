import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicRequestUrl } from "@/lib/public-url";

const schema = z.object({
  athleteId: z.string().min(1),
  returnTo: z.string().optional(),
});

function safeReturnTo(value?: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/watchlist";
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(publicRequestUrl(req, "/login?status=session-required"), 303);

  const form = await req.formData();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.redirect(publicRequestUrl(req, "/watchlist"), 303);

  const athlete = await prisma.athlete.findUnique({ where: { id: parsed.data.athleteId }, select: { id: true, marketEnabled: true } });
  if (!athlete?.marketEnabled) return NextResponse.redirect(publicRequestUrl(req, safeReturnTo(parsed.data.returnTo)), 303);

  const key = { userId_athleteId: { userId: user.id, athleteId: athlete.id } };
  const existing = await prisma.watchlistEntry.findUnique({ where: key });
  if (existing) {
    await prisma.watchlistEntry.delete({ where: key });
  } else {
    await prisma.watchlistEntry.create({ data: { userId: user.id, athleteId: athlete.id } });
  }

  return NextResponse.redirect(publicRequestUrl(req, safeReturnTo(parsed.data.returnTo)), 303);
}
