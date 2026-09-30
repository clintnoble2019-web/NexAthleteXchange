import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const tokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function requestPasswordRecovery(email: string) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email.trim().toLowerCase(), mode: "insensitive" }, accountFrozen: false }, select: { id: true, email: true } });
  const endpoint = process.env.AUTH_EMAIL_WEBHOOK_URL;
  const secret = process.env.AUTH_EMAIL_WEBHOOK_TOKEN;
  const origin = process.env.APP_ORIGIN;
  // Missing mail configuration never produces a public reset token.
  if (!user || !endpoint || !secret || !origin) return;
  if (!endpoint.startsWith("https://") && process.env.NODE_ENV === "production") throw new Error("Password recovery email endpoint must use HTTPS.");
  const token = crypto.randomBytes(32).toString("hex");
  const hash = tokenHash(token);
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  });
  const link = new URL("/reset-password", origin);
  link.searchParams.set("token", token);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` }, body: JSON.stringify({ type: "password_reset", to: user.email, resetUrl: link.toString(), expiresInMinutes: 30 }), signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!response.ok) throw new Error("Password recovery email delivery failed.");
  } catch (error) {
    await prisma.passwordResetToken.updateMany({ where: { tokenHash: hash }, data: { usedAt: new Date() } });
    throw error;
  }
}

export async function resetPassword(token: string, password: string) {
  if (!/^[a-f0-9]{64}$/.test(token) || password.length < 8 || password.length > 128) throw new Error("Use a valid reset link and a password of 8–128 characters.");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const reset = await tx.passwordResetToken.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: { select: { accountFrozen: true } } } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date() || reset.user.accountFrozen) throw new Error("This reset link has expired or already been used. Request another link.");
    await tx.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    await tx.passwordResetToken.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } });
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
