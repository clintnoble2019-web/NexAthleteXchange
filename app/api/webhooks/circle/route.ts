import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCircleWebhook } from "@/lib/circle-wallets";
import { findCircleWalletOwner, reconcileCircleTransaction, syncCircleUsdcDeposit } from "@/lib/provider-funding";

function transactionId(envelope: Record<string, any>) {
  const n = envelope?.notification || {};
  return String(n?.transaction?.id || n?.transactionId || n?.id || "");
}

export async function POST(req: Request) {
  if (process.env.CIRCLE_WEBHOOK_ENABLED !== "1") return NextResponse.json({ error: "Webhook is not enabled." }, { status: 503 });
  const rawBody = await req.text();
  const valid = await verifyCircleWebhook(rawBody, req.headers.get("x-circle-signature"), req.headers.get("x-circle-key-id"));
  if (!valid) return NextResponse.json({ error: "Invalid Circle webhook signature." }, { status: 401 });

  try {
    const envelope = JSON.parse(rawBody) as Record<string, any>;
    const notificationId = String(envelope?.notificationId || "");
    const notificationType = String(envelope?.notificationType || "unknown");
    if (!notificationId) return NextResponse.json({ error: "Missing Circle notification identifier." }, { status: 400 });
    const prior = await prisma.adminAuditEvent.findFirst({ where: { action: "CIRCLE_WEBHOOK_RECEIVED", targetId: notificationId } });
    if (prior) return NextResponse.json({ received: true, duplicate: true });

    const txId = transactionId(envelope);
    let walletOwner: string | null = null;
    let state: string | null = null;
    if (txId) {
      const reconciled = await reconcileCircleTransaction(txId);
      state = reconciled.transaction.state;
      const walletId = reconciled.transaction.walletId;
      if (walletId) {
        walletOwner = await findCircleWalletOwner(walletId);
        if (walletOwner && reconciled.transaction.transactionType === "INBOUND" && reconciled.transaction.state === "COMPLETE") {
          await syncCircleUsdcDeposit(walletOwner);
        }
      }
    }

    await prisma.adminAuditEvent.create({
      data: {
        actorId: "circle",
        targetId: notificationId,
        action: "CIRCLE_WEBHOOK_RECEIVED",
        reason: "Verified Circle notification processed.",
        details: { notificationType, transactionId: txId || null, transactionState: state, walletOwner: walletOwner || null },
      },
    });
    return NextResponse.json({ received: true, duplicate: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Circle webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
