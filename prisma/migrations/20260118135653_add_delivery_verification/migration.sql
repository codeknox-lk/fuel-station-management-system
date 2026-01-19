/*
  Warnings:

  - You are about to drop the column `dipAfter` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `dipBefore` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `theoreticalBefore` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `varianceBefore` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `theoreticalStock` on the `TankDip` table. All the data in the column will be lost.
  - You are about to drop the column `variance` on the `TankDip` table. All the data in the column will be lost.
  - You are about to drop the column `variancePercentage` on the `TankDip` table. All the data in the column will be lost.
  - You are about to drop the `TankPumpReading` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'DISCREPANCY');

-- DropForeignKey
ALTER TABLE "public"."TankPumpReading" DROP CONSTRAINT "TankPumpReading_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TankPumpReading" DROP CONSTRAINT "TankPumpReading_nozzleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TankPumpReading" DROP CONSTRAINT "TankPumpReading_tankDipId_fkey";

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "dipAfter",
DROP COLUMN "dipBefore",
DROP COLUMN "theoreticalBefore",
DROP COLUMN "varianceBefore",
ADD COLUMN     "actualReceived" DOUBLE PRECISION,
ADD COLUMN     "afterDipReading" DOUBLE PRECISION,
ADD COLUMN     "afterDipTime" TIMESTAMP(3),
ADD COLUMN     "beforeDipReading" DOUBLE PRECISION,
ADD COLUMN     "beforeDipTime" TIMESTAMP(3),
ADD COLUMN     "fuelSoldDuring" DOUBLE PRECISION,
ADD COLUMN     "verificationStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;

-- AlterTable
ALTER TABLE "TankDip" DROP COLUMN "theoreticalStock",
DROP COLUMN "variance",
DROP COLUMN "variancePercentage";

-- DropTable
DROP TABLE "public"."TankPumpReading";

-- CreateIndex
CREATE INDEX "Delivery_verificationStatus_idx" ON "Delivery"("verificationStatus");
