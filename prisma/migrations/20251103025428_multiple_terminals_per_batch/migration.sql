/*
  Warnings:

  - You are about to drop the column `amexAmount` on the `PosBatch` table. All the data in the column will be lost.
  - You are about to drop the column `endNumber` on the `PosBatch` table. All the data in the column will be lost.
  - You are about to drop the column `masterAmount` on the `PosBatch` table. All the data in the column will be lost.
  - You are about to drop the column `qrAmount` on the `PosBatch` table. All the data in the column will be lost.
  - You are about to drop the column `startNumber` on the `PosBatch` table. All the data in the column will be lost.
  - You are about to drop the column `terminalId` on the `PosBatch` table. All the data in the column will be lost.
  - You are about to drop the column `transactionCount` on the `PosBatch` table. All the data in the column will be lost.
  - You are about to drop the column `visaAmount` on the `PosBatch` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PosBatch" DROP CONSTRAINT "PosBatch_terminalId_fkey";

-- DropIndex
DROP INDEX "public"."PosBatch_terminalId_idx";

-- AlterTable
ALTER TABLE "PosBatch" DROP COLUMN "amexAmount",
DROP COLUMN "endNumber",
DROP COLUMN "masterAmount",
DROP COLUMN "qrAmount",
DROP COLUMN "startNumber",
DROP COLUMN "terminalId",
DROP COLUMN "transactionCount",
DROP COLUMN "visaAmount";

-- CreateTable
CREATE TABLE "PosBatchTerminalEntry" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "startNumber" TEXT NOT NULL,
    "endNumber" TEXT NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "visaAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "masterAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amexAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qrAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosBatchTerminalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosBatchTerminalEntry_batchId_idx" ON "PosBatchTerminalEntry"("batchId");

-- CreateIndex
CREATE INDEX "PosBatchTerminalEntry_terminalId_idx" ON "PosBatchTerminalEntry"("terminalId");

-- AddForeignKey
ALTER TABLE "PosBatch" ADD CONSTRAINT "PosBatch_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosBatchTerminalEntry" ADD CONSTRAINT "PosBatchTerminalEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PosBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosBatchTerminalEntry" ADD CONSTRAINT "PosBatchTerminalEntry_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
