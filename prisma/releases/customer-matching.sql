-- CreateEnum
CREATE TYPE "ScoutOrderStatus" AS ENUM ('OPEN', 'PARTIAL', 'FILLED', 'CANCELED');

-- CreateTable
CREATE TABLE "ScoutWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environment" "RealMarketEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reservedCash" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "environment" "RealMarketEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "costBasis" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutOrder" (
    "id" TEXT NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "environment" "RealMarketEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "side" "TradeSide" NOT NULL,
    "status" "ScoutOrderStatus" NOT NULL DEFAULT 'OPEN',
    "price" DECIMAL(18,2) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "remaining" DECIMAL(18,4) NOT NULL,
    "cashHold" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "feePaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutFill" (
    "id" TEXT NOT NULL,
    "environment" "RealMarketEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "buyOrderId" TEXT NOT NULL,
    "sellOrderId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "gross" DECIMAL(18,2) NOT NULL,
    "buyFee" DECIMAL(18,2) NOT NULL,
    "sellFee" DECIMAL(18,2) NOT NULL,
    "sellerPnl" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutFill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutLedgerEntry" (
    "id" TEXT NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "environment" "RealMarketEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,
    "reservedAfter" DECIMAL(18,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutCashTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environment" "RealMarketEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "type" "RealFundingType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutCashTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutInventoryGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "environment" "RealMarketEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "quantity" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutInventoryGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoutWallet_userId_key" ON "ScoutWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutPosition_userId_athleteId_key" ON "ScoutPosition"("userId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutOrder_sequence_key" ON "ScoutOrder"("sequence");

-- CreateIndex
CREATE INDEX "ScoutOrder_athleteId_side_status_price_sequence_idx" ON "ScoutOrder"("athleteId", "side", "status", "price", "sequence");

-- CreateIndex
CREATE INDEX "ScoutOrder_userId_status_idx" ON "ScoutOrder"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutOrder_userId_requestKey_key" ON "ScoutOrder"("userId", "requestKey");

-- CreateIndex
CREATE INDEX "ScoutFill_createdAt_idx" ON "ScoutFill"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutLedgerEntry_sequence_key" ON "ScoutLedgerEntry"("sequence");

-- CreateIndex
CREATE INDEX "ScoutLedgerEntry_userId_sequence_idx" ON "ScoutLedgerEntry"("userId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutCashTransfer_userId_requestKey_key" ON "ScoutCashTransfer"("userId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutInventoryGrant_userId_athleteId_key" ON "ScoutInventoryGrant"("userId", "athleteId");

-- AddForeignKey
ALTER TABLE "ScoutWallet" ADD CONSTRAINT "ScoutWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutPosition" ADD CONSTRAINT "ScoutPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutPosition" ADD CONSTRAINT "ScoutPosition_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutOrder" ADD CONSTRAINT "ScoutOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutOrder" ADD CONSTRAINT "ScoutOrder_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutFill" ADD CONSTRAINT "ScoutFill_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "ScoutOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutFill" ADD CONSTRAINT "ScoutFill_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "ScoutOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutLedgerEntry" ADD CONSTRAINT "ScoutLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutCashTransfer" ADD CONSTRAINT "ScoutCashTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutInventoryGrant" ADD CONSTRAINT "ScoutInventoryGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutInventoryGrant" ADD CONSTRAINT "ScoutInventoryGrant_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
