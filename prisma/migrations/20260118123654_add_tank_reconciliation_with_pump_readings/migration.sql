-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "dipAfter" DOUBLE PRECISION,
ADD COLUMN     "dipBefore" DOUBLE PRECISION,
ADD COLUMN     "theoreticalBefore" DOUBLE PRECISION,
ADD COLUMN     "varianceBefore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TankDip" ADD COLUMN     "theoreticalStock" DOUBLE PRECISION,
ADD COLUMN     "variance" DOUBLE PRECISION,
ADD COLUMN     "variancePercentage" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "TankPumpReading" (
    "id" TEXT NOT NULL,
    "nozzleId" TEXT NOT NULL,
    "reading" DOUBLE PRECISION NOT NULL,
    "tankDipId" TEXT,
    "deliveryId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TankPumpReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TankPumpReading_nozzleId_idx" ON "TankPumpReading"("nozzleId");

-- CreateIndex
CREATE INDEX "TankPumpReading_tankDipId_idx" ON "TankPumpReading"("tankDipId");

-- CreateIndex
CREATE INDEX "TankPumpReading_deliveryId_idx" ON "TankPumpReading"("deliveryId");

-- AddForeignKey
ALTER TABLE "TankPumpReading" ADD CONSTRAINT "TankPumpReading_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "Nozzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankPumpReading" ADD CONSTRAINT "TankPumpReading_tankDipId_fkey" FOREIGN KEY ("tankDipId") REFERENCES "TankDip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankPumpReading" ADD CONSTRAINT "TankPumpReading_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
