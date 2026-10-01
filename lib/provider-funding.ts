import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  circleConfigured,
  createCircleUsdcTransfer,
  ensureCircleWallet,
  getCircleTransaction,
  getCircleUsdcBalance,
  getCircleWalletBalances,
  getCircleWalletRecord,
  validSolanaAddress,
} from "@/lib/circle-wallets";
import { screenCircleAddress } from "@/lib/circle-compliance";
import { assertProviderIdentityVerified } from "@/lib/provider-identity";

const BALANCE_SYNC_ACTION = "CIRCLE_USDC_BALANCE_SYNC";
const ZERO = new Prisma.Decimal(0);

function money(value: string | number) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(String(value))) throw new Error("Amount must use at most two decimal places.");
  const amount = new Prisma.Decimal(String(value));
  if (amount.lt("1.00") || amount.gt("10000.00")) throw new Error("USDC funding amounts must be between $1 and $10,000 in the test environment.");
  return amount.toDecimalPlaces(2);
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function assertEligible(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountFrozen: true } });
  if (!user || user.accountFrozen) throw new Error("This account cannot use Real Market funding.");
  await assertProviderIdentityVerified(userId);
  if (!circleConfigured()) throw new Error("Circle USDC funding is not configured.");
}

async function lockProviderFunding(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`nex-provider-usdc:${userId}`}))`;
}

async function providerAvailableBalanceTx(tx: Prisma.TransactionClient, userId: string) {
  const [deposits, completedWithdrawals, pendingWithdrawals] = await Promise.all([
    tx.realFundingTransaction.aggregate({
      where: { userId, environment: "SANDBOX", rail: "USDC_SOLANA", type: "DEPOSIT", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    tx.realFundingTransaction.aggregate({
      where: { userId, environment: "SANDBOX", rail: "USDC_SOLANA", type: "WITHDRAWAL", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    tx.realFundingTransaction.aggregate({
      where: { userId, environment: "SANDBOX", rail: "USDC_SOLANA", type: "WITHDRAWAL", status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);
  const deposited = deposits._sum.amount || ZERO;
  const withdrawn = completedWithdrawals._sum.amount || ZERO;
  const pending = pendingWithdrawals._sum.amount || ZERO;
  return Prisma.Decimal.max(ZERO, deposited.sub(withdrawn).sub(pending));
}

async function providerAvailableBalance(userId: string) {
  return prisma.$transaction(async tx => {
    await lockProviderFunding(tx, userId);
    return providerAvailableBalanceTx(tx, userId);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });
}

export async function ensureUsdcDepositWallet(userId: string) {
  await assertEligible(userId);
  return ensureCircleWallet(userId);
}

export async function syncCircleUsdcDeposit(userId: string) {
  await assertEligible(userId);
  const wallet = await ensureCircleWallet(userId);
  const observed = new Prisma.Decimal(String(await getCircleUsdcBalance(wallet.walletId))).toDecimalPlaces(6);
  return prisma.$transaction(async tx => {
    await lockProviderFunding(tx, userId);
    const last = await tx.adminAuditEvent.findFirst({ where: { targetId: userId, action: BALANCE_SYNC_ACTION }, orderBy: { createdAt: "desc" } });
    const lastDetails = (last?.details || {}) as Record<string, unknown>;
    const previous = new Prisma.Decimal(String(lastDetails.observedBalance || "0"));
    const rawDelta = observed.sub(previous);
    const credit = rawDelta.gt(0) ? rawDelta.toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN) : ZERO;
    let fundingId: string | null = null;

    if (credit.gte("0.01")) {
      if (credit.gt("10000")) throw new Error("A single provider-funding sync cannot credit more than 10,000 testnet USDC.");
      const providerRef = `circle-balance:${wallet.walletId}:${observed.toFixed(6)}`;
      const prior = await tx.realFundingTransaction.findFirst({ where: { userId, environment: "SANDBOX", type: "DEPOSIT", rail: "USDC_SOLANA", providerRef } });
      if (!prior) {
        const funding = await tx.realFundingTransaction.create({
          data: {
            userId,
            environment: "SANDBOX",
            type: "DEPOSIT",
            rail: "USDC_SOLANA",
            status: "COMPLETED",
            amount: credit,
            asset: "USDC",
            network: wallet.blockchain,
            providerRef,
            externalAddress: wallet.address,
            completedAt: new Date(),
          },
        });
        fundingId = funding.id;
      }
    }

    if (!last || !observed.eq(previous)) {
      await tx.adminAuditEvent.create({
        data: {
          actorId: "circle",
          targetId: userId,
          action: BALANCE_SYNC_ACTION,
          reason: "Observed Circle USDC deposit-wallet balance synchronized without changing fake market cash.",
          details: { walletId: wallet.walletId, observedBalance: observed.toFixed(6), previousBalance: previous.toFixed(6), creditedProviderUsdc: credit.toFixed(2) },
        },
      });
    }
    const available = await providerAvailableBalanceTx(tx, userId);
    return { observedBalance: observed.toFixed(6), credited: credit.toFixed(2), fundingId, providerAvailable: available.toFixed(2) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });
}

async function releaseWithdrawal(fundingId: string, reason: string) {
  return prisma.$transaction(async tx => {
    const funding = await tx.realFundingTransaction.findUnique({ where: { id: fundingId } });
    if (!funding || funding.status !== "PENDING" || funding.type !== "WITHDRAWAL") return funding;
    await lockProviderFunding(tx, funding.userId);
    await tx.adminAuditEvent.create({ data: { actorId: "circle", targetId: funding.userId, action: "USDC_WITHDRAWAL_RELEASED", reason, details: { fundingId: funding.id, providerRef: funding.providerRef } } });
    return tx.realFundingTransaction.update({ where: { id: funding.id }, data: { status: "FAILED", failureReason: reason } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });
}

export async function startCircleUsdcWithdrawal(userId: string, amountInput: string, destinationAddress: string) {
  await assertEligible(userId);
  if (!validSolanaAddress(destinationAddress)) throw new Error("Enter a valid Solana destination address.");
  const amount = money(amountInput);
  await screenCircleAddress(destinationAddress);
  const settlementWalletId = process.env.CIRCLE_SETTLEMENT_WALLET_ID?.trim();
  if (!settlementWalletId) throw new Error("The Circle settlement wallet is not configured for withdrawals.");

  const funding = await prisma.$transaction(async tx => {
    await lockProviderFunding(tx, userId);
    const pending = await tx.realFundingTransaction.findFirst({ where: { userId, environment: "SANDBOX", rail: "USDC_SOLANA", type: "WITHDRAWAL", status: "PENDING" }, orderBy: { createdAt: "desc" } });
    if (pending) throw new Error("A USDC withdrawal is already pending for this account.");
    const available = await providerAvailableBalanceTx(tx, userId);
    if (available.lt(amount)) throw new Error("Only provider-funded Devnet USDC can be withdrawn. Fake Real Market cash and test trading gains are never withdrawable.");
    const created = await tx.realFundingTransaction.create({
      data: { userId, environment: "SANDBOX", type: "WITHDRAWAL", rail: "USDC_SOLANA", status: "PENDING", amount, asset: "USDC", network: "SOL-DEVNET", externalAddress: destinationAddress },
    });
    await tx.adminAuditEvent.create({ data: { actorId: userId, targetId: userId, action: "USDC_WITHDRAWAL_REQUESTED", reason: "User confirmed a compliance-screened Solana Devnet USDC withdrawal from provider-funded testnet balance only.", details: { fundingId: created.id, amount: amount.toFixed(2), destinationHash: hash(destinationAddress), network: "SOL-DEVNET" } } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });

  try {
    const balances = await getCircleWalletBalances(settlementWalletId);
    const usdcTokenId = process.env.CIRCLE_USDC_TOKEN_ID!.trim();
    const usdc = balances.find(item => item.token?.id === usdcTokenId);
    if (!usdc || new Prisma.Decimal(usdc.amount).lt(amount)) throw new Error("The test settlement wallet does not have enough USDC for this withdrawal.");
    const native = balances.find(item => item.token?.isNative === true);
    if (process.env.CIRCLE_SOL_GAS_SPONSORED !== "1" && (!native || new Prisma.Decimal(native.amount).lte(0))) throw new Error("The test settlement wallet needs SOL for network fees before withdrawals can be sent.");
    const transfer = await createCircleUsdcTransfer({ walletId: settlementWalletId, destinationAddress, amount: amount.toFixed(2), fundingId: funding.id });
    await prisma.realFundingTransaction.update({ where: { id: funding.id }, data: { providerRef: transfer.id } });
    await prisma.adminAuditEvent.create({ data: { actorId: "circle", targetId: userId, action: "USDC_WITHDRAWAL_SUBMITTED", reason: "Withdrawal submitted to Circle for compliance checks and Solana broadcast.", details: { fundingId: funding.id, transactionId: transfer.id } } });
    return { ...funding, providerRef: transfer.id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Circle withdrawal submission failed.";
    await releaseWithdrawal(funding.id, reason);
    throw error;
  }
}

async function finalizeWithdrawal(fundingId: string, transaction: { id: string; txHash?: string }) {
  return prisma.$transaction(async tx => {
    const funding = await tx.realFundingTransaction.findUnique({ where: { id: fundingId } });
    if (!funding || funding.status !== "PENDING") return funding;
    await lockProviderFunding(tx, funding.userId);
    await tx.adminAuditEvent.create({ data: { actorId: "circle", targetId: funding.userId, action: "USDC_WITHDRAWAL_COMPLETED", reason: "Circle confirmed the Solana Devnet USDC transfer.", details: { fundingId: funding.id, transactionId: transaction.id, txHash: transaction.txHash || null } } });
    return tx.realFundingTransaction.update({ where: { id: funding.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });
}

export async function reconcileCircleTransaction(transactionId: string) {
  const funding = await prisma.realFundingTransaction.findFirst({ where: { providerRef: transactionId, status: "PENDING", environment: "SANDBOX", rail: "USDC_SOLANA" } });
  const transaction = await getCircleTransaction(transactionId);
  if (!funding) return { funding: null, transaction };
  const actions = transaction.transactionScreeningEvaluation?.actions || [];
  if (actions.includes("DENY") || transaction.state === "DENIED") {
    return { funding: await releaseWithdrawal(funding.id, "Circle denied the withdrawal during transaction screening."), transaction };
  }
  if (["FAILED", "CANCELLED"].includes(transaction.state)) {
    return { funding: await releaseWithdrawal(funding.id, transaction.errorReason || `Circle transaction ${transaction.state.toLowerCase()}.`), transaction };
  }
  if (transaction.state === "COMPLETE") return { funding: await finalizeWithdrawal(funding.id, transaction), transaction };
  return { funding, transaction };
}

export async function syncPendingCircleWithdrawals(userId: string) {
  await assertEligible(userId);
  const pending = await prisma.realFundingTransaction.findMany({ where: { userId, environment: "SANDBOX", rail: "USDC_SOLANA", type: "WITHDRAWAL", status: "PENDING", providerRef: { not: null } }, orderBy: { createdAt: "asc" }, take: 10 });
  const results = [];
  for (const item of pending) results.push(await reconcileCircleTransaction(item.providerRef!));
  return results;
}

export async function findCircleWalletOwner(walletId: string) {
  const events = await prisma.adminAuditEvent.findMany({ where: { action: "CIRCLE_WALLET_CREATED" }, orderBy: { createdAt: "desc" }, take: 2000 });
  for (const event of events) {
    const details = event.details as Record<string, unknown>;
    if (details.walletId === walletId) return event.targetId;
  }
  return null;
}

export async function fundingStatus(userId: string) {
  const [wallet, transfers, providerAvailable] = await Promise.all([
    getCircleWalletRecord(userId),
    prisma.realFundingTransaction.findMany({ where: { userId, environment: "SANDBOX", rail: "USDC_SOLANA" }, orderBy: { createdAt: "desc" }, take: 20 }),
    providerAvailableBalance(userId),
  ]);
  return { wallet, transfers, providerAvailable: providerAvailable.toFixed(2) };
}
