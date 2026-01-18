-- AlterTable
ALTER TABLE "Tank" ADD COLUMN     "tankNumber" TEXT NOT NULL DEFAULT 'TANK-1';

-- CreateIndex
CREATE UNIQUE INDEX "Tank_stationId_tankNumber_key" ON "Tank"("stationId", "tankNumber");



