-- CreateEnum
CREATE TYPE "OfficeStaffRole" AS ENUM ('MANAGER', 'SUPERVISOR', 'OFFICE_STAFF', 'ACCOUNTANT', 'CASHIER');

-- CreateTable
CREATE TABLE "OfficeStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT,
    "stationId" TEXT NOT NULL,
    "role" "OfficeStaffRole" NOT NULL DEFAULT 'MANAGER',
    "phone" TEXT,
    "email" TEXT,
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hireDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeStaffSalaryPayment" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "officeStaffId" TEXT NOT NULL,
    "paymentMonth" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loans" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" "PaymentType" NOT NULL DEFAULT 'CASH',
    "paymentReference" TEXT,
    "paidBy" TEXT,
    "notes" TEXT,
    "status" "SalaryPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeStaffSalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfficeStaff_stationId_idx" ON "OfficeStaff"("stationId");

-- CreateIndex
CREATE INDEX "OfficeStaff_role_idx" ON "OfficeStaff"("role");

-- CreateIndex
CREATE INDEX "OfficeStaff_isActive_idx" ON "OfficeStaff"("isActive");

-- CreateIndex
CREATE INDEX "OfficeStaffSalaryPayment_stationId_idx" ON "OfficeStaffSalaryPayment"("stationId");

-- CreateIndex
CREATE INDEX "OfficeStaffSalaryPayment_officeStaffId_idx" ON "OfficeStaffSalaryPayment"("officeStaffId");

-- CreateIndex
CREATE INDEX "OfficeStaffSalaryPayment_paymentMonth_idx" ON "OfficeStaffSalaryPayment"("paymentMonth");

-- CreateIndex
CREATE INDEX "OfficeStaffSalaryPayment_paymentDate_idx" ON "OfficeStaffSalaryPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "OfficeStaffSalaryPayment_status_idx" ON "OfficeStaffSalaryPayment"("status");

-- AddForeignKey
ALTER TABLE "OfficeStaff" ADD CONSTRAINT "OfficeStaff_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeStaffSalaryPayment" ADD CONSTRAINT "OfficeStaffSalaryPayment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeStaffSalaryPayment" ADD CONSTRAINT "OfficeStaffSalaryPayment_officeStaffId_fkey" FOREIGN KEY ("officeStaffId") REFERENCES "OfficeStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
