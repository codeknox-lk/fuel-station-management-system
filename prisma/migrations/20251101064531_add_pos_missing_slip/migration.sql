-- CreateTable
CREATE TABLE "PosMissingSlip" (
    "id" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "lastFourDigits" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosMissingSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosMissingSlip_terminalId_idx" ON "PosMissingSlip"("terminalId");

-- CreateIndex
CREATE INDEX "PosMissingSlip_shiftId_idx" ON "PosMissingSlip"("shiftId");

-- CreateIndex
CREATE INDEX "PosMissingSlip_timestamp_idx" ON "PosMissingSlip"("timestamp");

-- AddForeignKey
ALTER TABLE "PosMissingSlip" ADD CONSTRAINT "PosMissingSlip_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosMissingSlip" ADD CONSTRAINT "PosMissingSlip_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
