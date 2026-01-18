-- CreateEnum
CREATE TYPE "SafeTransactionType" AS ENUM ('CASH_FUEL_SALES', 'POS_CARD_PAYMENT', 'CREDIT_PAYMENT', 'CHEQUE_RECEIVED', 'LOAN_REPAID', 'EXPENSE', 'LOAN_GIVEN', 'BANK_DEPOSIT', 'CASH_TRANSFER', 'COUNT_ADJUSTMENT', 'OPENING_BALANCE');

-- CreateTable
CREATE TABLE "Safe" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCounted" TIMESTAMP(3),
    "countedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Safe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeTransaction" (
    "id" TEXT NOT NULL,
    "safeId" TEXT NOT NULL,
    "type" "SafeTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "shiftId" TEXT,
    "batchId" TEXT,
    "creditSaleId" TEXT,
    "chequeId" TEXT,
    "expenseId" TEXT,
    "loanId" TEXT,
    "depositId" TEXT,
    "description" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Safe_stationId_key" ON "Safe"("stationId");

-- CreateIndex
CREATE INDEX "Safe_stationId_idx" ON "Safe"("stationId");

-- CreateIndex
CREATE INDEX "SafeTransaction_safeId_idx" ON "SafeTransaction"("safeId");

-- CreateIndex
CREATE INDEX "SafeTransaction_type_idx" ON "SafeTransaction"("type");

-- CreateIndex
CREATE INDEX "SafeTransaction_timestamp_idx" ON "SafeTransaction"("timestamp");

-- AddForeignKey
ALTER TABLE "Safe" ADD CONSTRAINT "Safe_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeTransaction" ADD CONSTRAINT "SafeTransaction_safeId_fkey" FOREIGN KEY ("safeId") REFERENCES "Safe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
