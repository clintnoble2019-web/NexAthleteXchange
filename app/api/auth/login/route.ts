import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { consumeRateLimit, requestSource } from "@/lib/request-security";
import { publicRequestUrl } from "@/lib/public-url";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const allowed = await consumeRateLimit("login-email", email, 10, 600);
  const sourceAllowed = await consumeRateLimit("login-source", requestSource(req), process.env.TRUST_PROXY_IP === "1" ? 100 : 2000, 600);
  if (!allowed || !sourceAllowed) return NextResponse.redirect(publicRequestUrl(req, "/login?error=rate"), 303);
  const password = String(form.get("password") || "");
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

  if (password.length > 128 || !user || user.accountFrozen || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.redirect(publicRequestUrl(req, "/login?error=invalid"), 303);
  }

  await createSession(user.id);
  return NextResponse.redirect(publicRequestUrl(req, "/market?auth=login"), 303);
}
