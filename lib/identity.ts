import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAccountActive, isAdmin } from "@/lib/beta-controls";
import { assertRealMarketSandbox } from "@/lib/real-market";

export async function beginSandboxEnrollment(userId: string) {
  assertRealMarketSandbox();
  return prisma.$transaction(async (tx) => {
    await assertAccountActive(tx, userId);
    return tx.realEnrollment.upsert({ where: { userId }, create: { userId, environment: "SANDBOX" }, update: {} });
  });
}

// Sandbox-only review. Production must use a verified, signed provider result.
// The identity token represents a provider's stable person identifier, never a document number.
export async function reviewSandboxIdentity(actorId: string, userId: string, decision: "VERIFIED" | "REJECTED", identityToken: string, reason: string) {
  assertRealMarketSandbox();
  if (!isAdmin(actorId)) throw new Error("Administrator access required.");
  if (reason.trim().length < 5) throw new Error("Provide a review reason.");
  if (decision === "VERIFIED" && !/^[a-zA-Z0-9_-]{8,100}$/.test(identityToken)) throw new Error("Use an opaque sandbox person ID of 8–100 characters.");
  const identityHash = decision === "VERIFIED" ? crypto.createHash("sha256").update(`sandbox-person:${identityToken}`).digest("hex") : null;
  try {
    return await prisma.$transaction(async (tx) => {
      await assertAccountActive(tx, actorId);
      await assertAccountActive(tx, userId);
      const existing = await tx.realEnrollment.findUnique({ where: { userId } });
      if (!existing) throw new Error("This account has not started identity verification.");
      // Revocation retains the identity reservation; it cannot be recycled onto another account.
      if (existing.identityHash && identityHash && existing.identityHash !== identityHash) throw new Error("An account's verified identity cannot be replaced.");
      const result = await tx.realEnrollment.update({ where: { userId }, data: {
        status: decision, identityHash: existing.identityHash || identityHash, reviewedAt: new Date(), providerRef: "sandbox-admin-review",
      } });
      await tx.adminAuditEvent.create({ data: { actorId, action: `IDENTITY_${decision}`, targetId: userId, reason: reason.trim(), details: { environment: "SANDBOX" } } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("This identity already belongs to a Real Market account.");
    throw error;
  }
}

export async function reserveRewardClaim(actorId: string, userId: string, campaign: string, reason: string) {
  if (!isAdmin(actorId)) throw new Error("Administrator access required.");
  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(campaign) || reason.trim().length < 5) throw new Error("Provide a campaign and review reason.");
  assertRealMarketSandbox();
  return prisma.$transaction(async (tx) => {
    await assertAccountActive(tx, actorId);
    await assertAccountActive(tx, userId);
    const enrollment = await tx.realEnrollment.findUnique({ where: { userId } });
    if (enrollment?.status !== "VERIFIED" || !enrollment.identityHash || enrollment.environment !== "SANDBOX") throw new Error("A verified sandbox identity is required for reward eligibility.");
    const claim = await tx.rewardClaim.create({ data: { userId, campaign, identityHash: enrollment.identityHash } });
    await tx.adminAuditEvent.create({ data: { actorId, action: "REWARD_RESERVED", targetId: userId, reason, details: { campaign, claimId: claim.id, environment: "SANDBOX" } } });
    return claim;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
