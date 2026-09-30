import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const STARTING_NEXPOINTS = 5000;
const schema = z.object({ username: z.string().min(3).max(24), email: z.string().email(), password: z.string().min(8).max(128) });

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return new NextResponse("Invalid signup data", { status: 400 });
  const { username, email, password } = parsed.data;
  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (exists) return new NextResponse("Email or username already exists", { status: 409 });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, username, passwordHash, wallet: { create: { balance: STARTING_NEXPOINTS } } } });
    await tx.ledgerEntry.create({ data: { userId: created.id, type: "SIGNUP_CREDIT", amount: STARTING_NEXPOINTS, balance: STARTING_NEXPOINTS, reference: "initial-nexpoints-bankroll" } });
    return created;
  });
  await createSession(user.id);
  return NextResponse.redirect(new URL("/market", req.url), 303);
}
