import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasAcceptedCurrentTerms } from "@/lib/real-market-compliance";

export function isAdmin(userId: string) {
  return (process.env.ADMIN_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean).includes(userId);
}

export async function assertAccountActive(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { accountFrozen: true } });
  if (!user || user.accountFrozen) throw new Error("This account is paused. Contact support for help.");
}

export async function assertTradingOpen(tx: Prisma.TransactionClient, userId: string, sandbox = false) {
  await assertAccountActive(tx, userId);
  const control = await tx.betaControl.findUnique({ where: { id: "global" } });
  if (sandbox ? control?.sandboxPaused : control?.freeTradingPaused) throw new Error(control?.message || "Trading is temporarily paused.");
  if (sandbox) {
    const enrollment = await tx.realEnrollment.findUnique({ where: { userId } });
    if (enrollment?.status !== "VERIFIED" || enrollment.environment !== "SANDBOX") throw new Error("Complete sandbox identity verification before funding or trading.");
  }
}

export async function sandboxAccessVerified(userId: string) {
  const [enrollment, termsAccepted] = await Promise.all([
    prisma.realEnrollment.findUnique({ where: { userId } }),
    hasAcceptedCurrentTerms(userId),
  ]);
  return termsAccepted && enrollment?.status === "VERIFIED" && enrollment.environment === "SANDBOX";
}
