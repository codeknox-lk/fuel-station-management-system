-- CreateEnum
CREATE TYPE "PumperStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "PumperShift" AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'ANY');

-- AlterTable
ALTER TABLE "Pumper" ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "experience" DOUBLE PRECISION,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "shift" "PumperShift" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stationId" TEXT,
ADD COLUMN     "status" "PumperStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Pumper_stationId_idx" ON "Pumper"("stationId");

-- CreateIndex
CREATE INDEX "Pumper_status_idx" ON "Pumper"("status");

-- CreateIndex
CREATE INDEX "Pumper_isActive_idx" ON "Pumper"("isActive");

-- AddForeignKey
ALTER TABLE "Pumper" ADD CONSTRAINT "Pumper_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
