import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { publicRequestUrl } from "@/lib/public-url";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.redirect(publicRequestUrl(req, "/login?error=invalid"), 303);
  }

  await createSession(user.id);
  return NextResponse.redirect(publicRequestUrl(req, "/market?auth=login"), 303);
}
