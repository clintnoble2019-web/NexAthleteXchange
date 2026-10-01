import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAccountActive, isAdmin } from "@/lib/beta-controls";
import { cancelScoutOrdersTx } from "@/lib/scout-market";

export type AdminAction = "FREEZE" | "UNFREEZE" | "EXCLUDE_LEADERBOARD" | "RESTORE_LEADERBOARD" | "HALT_ATHLETE" | "RESUME_ATHLETE" | "PAUSE_FREE" | "RESUME_FREE" | "PAUSE_SANDBOX" | "RESUME_SANDBOX" | "SUSPEND_LP";
export const adminActions: AdminAction[] = ["FREEZE", "UNFREEZE", "EXCLUDE_LEADERBOARD", "RESTORE_LEADERBOARD", "HALT_ATHLETE", "RESUME_ATHLETE", "PAUSE_FREE", "RESUME_FREE", "PAUSE_SANDBOX", "RESUME_SANDBOX", "SUSPEND_LP"];

export async function correctAthletePrice(actorId: string, athleteId: string, priceInput: string, reason: string) {
  if (!isAdmin(actorId)) throw new Error("Administrator access required.");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(priceInput) || reason.trim().length < 5 || reason.length > 500) throw new Error("Provide a valid price and correction reason.");
  const price = new Prisma.Decimal(priceInput);
  if (price.lt(1) || price.gt(1000000)) throw new Error("Price must be between 1 and 1,000,000 NexPoints.");
  return prisma.$transaction(async (tx) => {
    await assertAccountActive(tx, actorId);
    const before = await tx.athlete.findUniqueOrThrow({ where: { id: athleteId } });
    await tx.athlete.update({ where: { id: athleteId }, data: { previousPrice: before.currentPrice, currentPrice: price } });
    await tx.priceSnapshot.create({ data: { athleteId, price, source: "admin-correction" } });
    return tx.adminAuditEvent.create({ data: { actorId, action: "CORRECT_PRICE", targetId: athleteId, reason: reason.trim(), details: { before: String(before.currentPrice), after: String(price) } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function applyAdminAction(actorId: string, action: AdminAction, targetId: string, reason: string) {
  if (!isAdmin(actorId)) throw new Error("Administrator access required.");
  if (!adminActions.includes(action) || reason.trim().length < 5 || reason.length > 500) throw new Error("Choose an action and provide a reason of 5–500 characters.");
  if (actorId === targetId && action === "FREEZE") throw new Error("You cannot freeze your own administrator account.");
  return prisma.$transaction(async (tx) => {
    await assertAccountActive(tx, actorId);
    let details: Prisma.InputJsonObject = {};
    if (["FREEZE", "UNFREEZE", "EXCLUDE_LEADERBOARD", "RESTORE_LEADERBOARD"].includes(action)) {
      const before = await tx.user.findUniqueOrThrow({ where: { id: targetId }, select: { accountFrozen: true, leaderboardEligible: true } });
      const data = action === "FREEZE" ? { accountFrozen: true } : action === "UNFREEZE" ? { accountFrozen: false } : { leaderboardEligible: action === "RESTORE_LEADERBOARD" };
      await tx.user.update({ where: { id: targetId }, data });
      if (action === "FREEZE") {
        await cancelScoutOrdersTx(tx, { userId: targetId }, "Account frozen by administrator");
        await tx.session.deleteMany({ where: { userId: targetId } });
      }
      details = { before, after: data };
    } else if (["HALT_ATHLETE", "RESUME_ATHLETE"].includes(action)) {
      const before = await tx.athlete.findUniqueOrThrow({ where: { id: targetId }, select: { marketEnabled: true } });
      await tx.athlete.update({ where: { id: targetId }, data: { marketEnabled: action === "RESUME_ATHLETE" } });
      if (action === "HALT_ATHLETE") await cancelScoutOrdersTx(tx, { athleteId: targetId }, "Athlete halted by administrator");
      details = { before, marketEnabled: action === "RESUME_ATHLETE" };
    } else if (action === "SUSPEND_LP") {
      const provider = await tx.liquidityProvider.findUniqueOrThrow({ where: { id: targetId } });
      if (provider.environment !== "SANDBOX") throw new Error("Only sandbox LP controls are available.");
      await tx.liquidityProvider.update({ where: { id: targetId }, data: { status: "SUSPENDED" } });
      const cancelled = await tx.liquidityQuote.updateMany({ where: { providerId: targetId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
      details = { quotesCancelled: cancelled.count };
    } else {
      targetId = "global";
      const before = await tx.betaControl.findUnique({ where: { id: targetId } });
      const data = action.endsWith("FREE") ? { freeTradingPaused: action === "PAUSE_FREE" } : { sandboxPaused: action === "PAUSE_SANDBOX" };
      await tx.betaControl.upsert({ where: { id: targetId }, create: { id: targetId, ...data }, update: data });
      details = { before: before ? { freeTradingPaused: before.freeTradingPaused, sandboxPaused: before.sandboxPaused } : {}, after: data };
    }
    return tx.adminAuditEvent.create({ data: { actorId, action, targetId, reason: reason.trim(), details } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
