-- CreateEnum
CREATE TYPE "SalaryPaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'CANCELLED');

-- AlterTable
ALTER TABLE "Pumper" ADD COLUMN     "baseSalary" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "SalaryPayment" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "pumperId" TEXT NOT NULL,
    "paymentMonth" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceAdd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceDeduct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loans" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentType" NOT NULL DEFAULT 'CASH',
    "paymentReference" TEXT,
    "paidBy" TEXT NOT NULL,
    "notes" TEXT,
    "status" "SalaryPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryPayment_stationId_idx" ON "SalaryPayment"("stationId");

-- CreateIndex
CREATE INDEX "SalaryPayment_pumperId_idx" ON "SalaryPayment"("pumperId");

-- CreateIndex
CREATE INDEX "SalaryPayment_paymentMonth_idx" ON "SalaryPayment"("paymentMonth");

-- CreateIndex
CREATE INDEX "SalaryPayment_paymentDate_idx" ON "SalaryPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "SalaryPayment_status_idx" ON "SalaryPayment"("status");

-- AddForeignKey
ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_pumperId_fkey" FOREIGN KEY ("pumperId") REFERENCES "Pumper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
