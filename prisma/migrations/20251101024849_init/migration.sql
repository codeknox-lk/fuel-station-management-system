-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'ACCOUNTS');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL_92', 'PETROL_95', 'DIESEL', 'SUPER_DIESEL', 'OIL');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('NORMAL', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TestPourType" AS ENUM ('L5', 'L50', 'L100');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MANAGER',
    "stationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openedBy" TEXT NOT NULL,
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "statistics" JSONB,
    "declaredAmounts" JSONB,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "nozzleId" TEXT NOT NULL,
    "pumperName" TEXT NOT NULL,
    "startMeterReading" DOUBLE PRECISION NOT NULL,
    "endMeterReading" DOUBLE PRECISION,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tank" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "currentLevel" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pump" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "pumpNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pump_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nozzle" (
    "id" TEXT NOT NULL,
    "pumpId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "nozzleNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nozzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankDip" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "reading" DOUBLE PRECISION NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "dipDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TankDip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fromSafe" BOOLEAN NOT NULL DEFAULT false,
    "paidBy" TEXT NOT NULL,
    "proof" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bankId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "depositSlip" TEXT,
    "depositedBy" TEXT NOT NULL,
    "depositDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanExternal" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "borrowerPhone" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanExternal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPumper" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "pumperName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanPumper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cheque" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "chequeNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bankId" TEXT NOT NULL,
    "receivedFrom" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'PENDING',
    "clearedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cheque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditSale" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "nozzleId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "slipPhoto" TEXT,
    "signedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPayment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "chequeNumber" TEXT,
    "bankId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosTerminal" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "terminalNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosBatch" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "startNumber" TEXT NOT NULL,
    "endNumber" TEXT NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledBy" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch" TEXT,
    "accountNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pumper" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pumper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeterAudit" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT,
    "nozzleId" TEXT NOT NULL,
    "reading" DOUBLE PRECISION NOT NULL,
    "meterReading" DOUBLE PRECISION NOT NULL,
    "previousReading" DOUBLE PRECISION NOT NULL,
    "deltaLitres" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION,
    "status" "AuditStatus",
    "timestamp" TIMESTAMP(3) NOT NULL,
    "auditTime" TIMESTAMP(3) NOT NULL,
    "auditedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeterAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPour" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "nozzleId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "testType" "TestPourType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "performedBy" TEXT NOT NULL,
    "returned" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OilSale" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'liters',
    "price" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "customerName" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OilSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "tenderType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "stationId" TEXT,
    "stationName" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_stationId_idx" ON "User"("stationId");

-- CreateIndex
CREATE INDEX "Station_isActive_idx" ON "Station"("isActive");

-- CreateIndex
CREATE INDEX "Shift_stationId_idx" ON "Shift"("stationId");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE INDEX "Shift_startTime_idx" ON "Shift"("startTime");

-- CreateIndex
CREATE INDEX "ShiftTemplate_stationId_idx" ON "ShiftTemplate"("stationId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_shiftId_idx" ON "ShiftAssignment"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_nozzleId_idx" ON "ShiftAssignment"("nozzleId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_status_idx" ON "ShiftAssignment"("status");

-- CreateIndex
CREATE INDEX "Tank_stationId_idx" ON "Tank"("stationId");

-- CreateIndex
CREATE INDEX "Tank_fuelType_idx" ON "Tank"("fuelType");

-- CreateIndex
CREATE INDEX "Pump_stationId_idx" ON "Pump"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "Pump_stationId_pumpNumber_key" ON "Pump"("stationId", "pumpNumber");

-- CreateIndex
CREATE INDEX "Nozzle_tankId_idx" ON "Nozzle"("tankId");

-- CreateIndex
CREATE UNIQUE INDEX "Nozzle_pumpId_nozzleNumber_key" ON "Nozzle"("pumpId", "nozzleNumber");

-- CreateIndex
CREATE INDEX "TankDip_stationId_idx" ON "TankDip"("stationId");

-- CreateIndex
CREATE INDEX "TankDip_tankId_idx" ON "TankDip"("tankId");

-- CreateIndex
CREATE INDEX "TankDip_dipDate_idx" ON "TankDip"("dipDate");

-- CreateIndex
CREATE INDEX "Delivery_stationId_idx" ON "Delivery"("stationId");

-- CreateIndex
CREATE INDEX "Delivery_tankId_idx" ON "Delivery"("tankId");

-- CreateIndex
CREATE INDEX "Delivery_deliveryDate_idx" ON "Delivery"("deliveryDate");

-- CreateIndex
CREATE INDEX "Expense_stationId_idx" ON "Expense"("stationId");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Deposit_stationId_idx" ON "Deposit"("stationId");

-- CreateIndex
CREATE INDEX "Deposit_bankId_idx" ON "Deposit"("bankId");

-- CreateIndex
CREATE INDEX "Deposit_depositDate_idx" ON "Deposit"("depositDate");

-- CreateIndex
CREATE INDEX "LoanExternal_stationId_idx" ON "LoanExternal"("stationId");

-- CreateIndex
CREATE INDEX "LoanExternal_status_idx" ON "LoanExternal"("status");

-- CreateIndex
CREATE INDEX "LoanExternal_dueDate_idx" ON "LoanExternal"("dueDate");

-- CreateIndex
CREATE INDEX "LoanPumper_stationId_idx" ON "LoanPumper"("stationId");

-- CreateIndex
CREATE INDEX "LoanPumper_status_idx" ON "LoanPumper"("status");

-- CreateIndex
CREATE INDEX "LoanPumper_dueDate_idx" ON "LoanPumper"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Cheque_chequeNumber_key" ON "Cheque"("chequeNumber");

-- CreateIndex
CREATE INDEX "Cheque_stationId_idx" ON "Cheque"("stationId");

-- CreateIndex
CREATE INDEX "Cheque_bankId_idx" ON "Cheque"("bankId");

-- CreateIndex
CREATE INDEX "Cheque_status_idx" ON "Cheque"("status");

-- CreateIndex
CREATE INDEX "Cheque_receivedDate_idx" ON "Cheque"("receivedDate");

-- CreateIndex
CREATE INDEX "CreditCustomer_phone_idx" ON "CreditCustomer"("phone");

-- CreateIndex
CREATE INDEX "CreditCustomer_isActive_idx" ON "CreditCustomer"("isActive");

-- CreateIndex
CREATE INDEX "CreditSale_customerId_idx" ON "CreditSale"("customerId");

-- CreateIndex
CREATE INDEX "CreditSale_shiftId_idx" ON "CreditSale"("shiftId");

-- CreateIndex
CREATE INDEX "CreditSale_timestamp_idx" ON "CreditSale"("timestamp");

-- CreateIndex
CREATE INDEX "CreditPayment_customerId_idx" ON "CreditPayment"("customerId");

-- CreateIndex
CREATE INDEX "CreditPayment_paymentDate_idx" ON "CreditPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "PosTerminal_stationId_idx" ON "PosTerminal"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "PosTerminal_stationId_terminalNumber_key" ON "PosTerminal"("stationId", "terminalNumber");

-- CreateIndex
CREATE INDEX "PosBatch_shiftId_idx" ON "PosBatch"("shiftId");

-- CreateIndex
CREATE INDEX "PosBatch_terminalId_idx" ON "PosBatch"("terminalId");

-- CreateIndex
CREATE INDEX "PosBatch_isReconciled_idx" ON "PosBatch"("isReconciled");

-- CreateIndex
CREATE INDEX "Price_stationId_idx" ON "Price"("stationId");

-- CreateIndex
CREATE INDEX "Price_fuelType_idx" ON "Price"("fuelType");

-- CreateIndex
CREATE INDEX "Price_effectiveDate_idx" ON "Price"("effectiveDate");

-- CreateIndex
CREATE INDEX "Price_isActive_idx" ON "Price"("isActive");

-- CreateIndex
CREATE INDEX "MeterAudit_shiftId_idx" ON "MeterAudit"("shiftId");

-- CreateIndex
CREATE INDEX "MeterAudit_nozzleId_idx" ON "MeterAudit"("nozzleId");

-- CreateIndex
CREATE INDEX "MeterAudit_timestamp_idx" ON "MeterAudit"("timestamp");

-- CreateIndex
CREATE INDEX "TestPour_shiftId_idx" ON "TestPour"("shiftId");

-- CreateIndex
CREATE INDEX "TestPour_nozzleId_idx" ON "TestPour"("nozzleId");

-- CreateIndex
CREATE INDEX "OilSale_stationId_idx" ON "OilSale"("stationId");

-- CreateIndex
CREATE INDEX "OilSale_saleDate_idx" ON "OilSale"("saleDate");

-- CreateIndex
CREATE INDEX "Tender_shiftId_idx" ON "Tender"("shiftId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_stationId_idx" ON "AuditLog"("stationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "Nozzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pump" ADD CONSTRAINT "Pump_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_pumpId_fkey" FOREIGN KEY ("pumpId") REFERENCES "Pump"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanExternal" ADD CONSTRAINT "LoanExternal_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPumper" ADD CONSTRAINT "LoanPumper_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CreditCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CreditCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosBatch" ADD CONSTRAINT "PosBatch_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterAudit" ADD CONSTRAINT "MeterAudit_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterAudit" ADD CONSTRAINT "MeterAudit_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "Nozzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPour" ADD CONSTRAINT "TestPour_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPour" ADD CONSTRAINT "TestPour_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "Nozzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OilSale" ADD CONSTRAINT "OilSale_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
