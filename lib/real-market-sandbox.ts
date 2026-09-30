import { assertTradingOpen } from "@/lib/beta-controls";
import {
  Prisma,
  RealFundingRail,
  RealFundingStatus,
  RealFundingType,
  RealLedgerType,
  RealMarketEnvironment,
  TradeSide,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertRealMarketSandbox, realMarket } from "@/lib/real-market";

const SANDBOX = RealMarketEnvironment.SANDBOX;
const MIN_QUANTITY = new Prisma.Decimal("0.01");
const MIN_VALUE = new Prisma.Decimal("0.01");
const MAX_SANDBOX_FUNDING = new Prisma.Decimal("1000000");
const TRADE_FEE = new Prisma.Decimal(String(realMarket.tradeFee));

function decimalAmount(value: number | string) {
  const amount = new Prisma.Decimal(String(value));
  if (!amount.isFinite() || amount.lte(0)) throw new Error("Amount must be greater than zero.");
  if (amount.gt(MAX_SANDBOX_FUNDING)) throw new Error("Sandbox amount exceeds the test limit.");
  return amount.toDecimalPlaces(2);
}

function mockProviderRef(rail: RealFundingRail) {
  const prefix = rail === RealFundingRail.USDC_SOLANA ? "solana-devnet" : "sandbox";
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function ensureSandboxRealWallet(userId: string) {
  assertRealMarketSandbox();
  return prisma.realWallet.upsert({
    where: { userId_environment: { userId, environment: SANDBOX } },
    create: { userId, environment: SANDBOX, currency: "USD", balance: 0 },
    update: {},
  });
}

export async function simulateSandboxFunding(
  userId: string,
  type: RealFundingType,
  rail: RealFundingRail,
  amountInput: number | string,
  externalAddress?: string,
) {
  assertRealMarketSandbox();
  if (!Object.values(RealFundingType).includes(type) || !Object.values(RealFundingRail).includes(rail)) throw new Error("Invalid funding request.");
  const amount = decimalAmount(amountInput);

  if (type === RealFundingType.WITHDRAWAL && rail === RealFundingRail.DEBIT_CARD) {
    throw new Error("Debit-card withdrawals are not supported.");
  }

  if (rail === RealFundingRail.USDC_SOLANA && type === RealFundingType.WITHDRAWAL) {
    const address = (externalAddress || "").trim();
    if (address.length < 32 || address.length > 64) {
      throw new Error("Enter a valid Solana sandbox wallet address.");
    }
  }

  const isCrypto = rail === RealFundingRail.USDC_SOLANA;
  const funding = await prisma.realFundingTransaction.create({
    data: {
      userId,
      environment: SANDBOX,
      type,
      rail,
      status: RealFundingStatus.PENDING,
      amount,
      asset: isCrypto ? realMarket.cryptoAsset : "USD",
      network: isCrypto ? realMarket.sandboxNetwork : null,
      providerRef: mockProviderRef(rail),
      externalAddress: externalAddress?.trim() || null,
    },
  });

  try {
    return await prisma.$transaction(async (tx) => {
      await assertTradingOpen(tx, userId, true);
      const wallet = await tx.realWallet.upsert({
        where: { userId_environment: { userId, environment: SANDBOX } },
        create: { userId, environment: SANDBOX, currency: "USD", balance: 0 },
        update: {},
      });

      if (type === RealFundingType.WITHDRAWAL && wallet.balance.lt(amount)) {
        const failed = await tx.realFundingTransaction.update({
          where: { id: funding.id },
          data: {
            status: RealFundingStatus.FAILED,
            failureReason: "Insufficient sandbox balance.",
          },
        });
        return { funding: failed, wallet };
      }

      const newBalance = type === RealFundingType.DEPOSIT
        ? wallet.balance.add(amount)
        : wallet.balance.sub(amount);

      const updatedWallet = await tx.realWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const ledgerType = type === RealFundingType.DEPOSIT
        ? RealLedgerType.SANDBOX_DEPOSIT
        : RealLedgerType.SANDBOX_WITHDRAWAL;
      const signedAmount = type === RealFundingType.DEPOSIT ? amount : amount.neg();

      await tx.realLedgerEntry.create({
        data: {
          userId,
          environment: SANDBOX,
          type: ledgerType,
          amount: signedAmount,
          balance: newBalance,
          reference: funding.id,
        },
      });

      const completed = await tx.realFundingTransaction.update({
        where: { id: funding.id },
        data: {
          status: RealFundingStatus.COMPLETED,
          completedAt: new Date(),
          failureReason: null,
        },
      });

      return { funding: completed, wallet: updatedWallet };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await prisma.realFundingTransaction.update({
      where: { id: funding.id },
      data: {
        status: RealFundingStatus.FAILED,
        failureReason: error instanceof Error ? error.message.slice(0, 240) : "Sandbox funding failed.",
      },
    }).catch(() => undefined);
    throw error;
  }
}

export async function executeSandboxRealTrade(
  userId: string,
  athleteId: string,
  side: TradeSide,
  quantityInput: number,
) {
  assertRealMarketSandbox();
  if (!Number.isFinite(quantityInput)) throw new Error("Quantity must be a valid number.");

  const quantity = new Prisma.Decimal(String(quantityInput));
  if (!Object.values(TradeSide).includes(side) || quantity.decimalPlaces() > 4 || quantity.gt(1000000)) throw new Error("Invalid trade side or quantity.");
  if (quantity.lt(MIN_QUANTITY)) throw new Error("Minimum trade quantity is 0.01 units.");

  return prisma.$transaction(async (tx) => {
    await assertTradingOpen(tx, userId, true);
    const [wallet, athlete, position] = await Promise.all([
      tx.realWallet.upsert({
        where: { userId_environment: { userId, environment: SANDBOX } },
        create: { userId, environment: SANDBOX, currency: "USD", balance: 0 },
        update: {},
      }),
      tx.athlete.findUnique({ where: { id: athleteId } }),
      tx.realPosition.findUnique({
        where: { userId_athleteId_environment: { userId, athleteId, environment: SANDBOX } },
      }),
    ]);

    if (!athlete || !athlete.active || !athlete.marketEnabled) {
      throw new Error("Athlete is not available for sandbox trading.");
    }

    const price = athlete.currentPrice;
    const gross = price.mul(quantity).toDecimalPlaces(2);
    if (gross.lt(MIN_VALUE)) throw new Error("Trade value must be at least $0.01.");

    if (side === TradeSide.BUY) {
      const totalDebit = gross.add(TRADE_FEE);
      if (wallet.balance.lt(totalDebit)) throw new Error("Insufficient sandbox USD balance.");

      const oldQty = position?.quantity ?? new Prisma.Decimal(0);
      const oldAllInCost = position ? position.averageCost.mul(oldQty) : new Prisma.Decimal(0);
      const newQty = oldQty.add(quantity);
      const averageCost = oldAllInCost.add(totalDebit).div(newQty).toDecimalPlaces(4);
      const afterTrade = wallet.balance.sub(gross);
      const finalBalance = afterTrade.sub(TRADE_FEE);

      await tx.realWallet.update({ where: { id: wallet.id }, data: { balance: finalBalance } });
      await tx.realPosition.upsert({
        where: { userId_athleteId_environment: { userId, athleteId, environment: SANDBOX } },
        create: { userId, athleteId, environment: SANDBOX, quantity, averageCost },
        update: { quantity: newQty, averageCost },
      });

      const trade = await tx.realTrade.create({
        data: {
          userId,
          athleteId,
          environment: SANDBOX,
          side,
          quantity,
          price,
          gross,
          fee: TRADE_FEE,
          netCashFlow: totalDebit.neg(),
          realizedPnl: 0,
        },
      });

      await tx.realLedgerEntry.createMany({
        data: [
          {
            userId,
            environment: SANDBOX,
            type: RealLedgerType.TRADE_BUY,
            amount: gross.neg(),
            balance: afterTrade,
            reference: trade.id,
          },
          {
            userId,
            environment: SANDBOX,
            type: RealLedgerType.TRADE_FEE,
            amount: TRADE_FEE.neg(),
            balance: finalBalance,
            reference: trade.id,
          },
        ],
      });

      return { trade, balance: finalBalance };
    }

    if (!position || position.quantity.lt(quantity)) throw new Error("Insufficient sandbox athlete units.");
    if (gross.lte(TRADE_FEE)) throw new Error("Sell value must be greater than the $2 trade fee.");

    const netCredit = gross.sub(TRADE_FEE);
    const afterTrade = wallet.balance.add(gross);
    const finalBalance = afterTrade.sub(TRADE_FEE);
    const remaining = position.quantity.sub(quantity);
    const realizedPnl = netCredit.sub(position.averageCost.mul(quantity)).toDecimalPlaces(2);

    await tx.realWallet.update({ where: { id: wallet.id }, data: { balance: finalBalance } });
    if (remaining.eq(0)) {
      await tx.realPosition.delete({ where: { id: position.id } });
    } else {
      await tx.realPosition.update({ where: { id: position.id }, data: { quantity: remaining } });
    }

    const trade = await tx.realTrade.create({
      data: {
        userId,
        athleteId,
        environment: SANDBOX,
        side,
        quantity,
        price,
        gross,
        fee: TRADE_FEE,
        netCashFlow: netCredit,
        realizedPnl,
      },
    });

    await tx.realLedgerEntry.createMany({
      data: [
        {
          userId,
          environment: SANDBOX,
          type: RealLedgerType.TRADE_SELL,
          amount: gross,
          balance: afterTrade,
          reference: trade.id,
        },
        {
          userId,
          environment: SANDBOX,
          type: RealLedgerType.TRADE_FEE,
          amount: TRADE_FEE.neg(),
          balance: finalBalance,
          reference: trade.id,
        },
      ],
    });

    return { trade, balance: finalBalance };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function formatRealMoney(value: Prisma.Decimal | number | string) {
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
