/*
  Warnings:

  - You are about to drop the column `fuelType` on the `Price` table. All the data in the column will be lost.
  - You are about to drop the column `fuelType` on the `Tank` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id,organizationId]` on the table `AuditLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Bank` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chequeId]` on the table `BankTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `BankTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creditPaymentId]` on the table `Cheque` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Cheque` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `CreditCustomer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `CreditPayment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `CreditSale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Delivery` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Deposit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Expense` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `LoanExternal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `LoanPumper` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `MeterAudit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Nozzle` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `OfficeStaff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `OfficeStaffSalaryPayment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `OilSale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `PosBatch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `PosBatchTerminalEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `PosMissingSlip` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `PosTerminal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Price` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Pump` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Pumper` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Safe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `SafeTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `SalaryPayment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Shift` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `ShiftAssignment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `ShiftTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Station` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Tank` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `TankDip` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `Tender` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `TestPour` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,organizationId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fuelId` to the `Price` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fuelId` to the `Tank` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'UNPAID', 'TRIALING');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYHERE', 'MANUAL');

-- CreateEnum
CREATE TYPE "DeliveryPaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGIN';
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'OPEN';
ALTER TYPE "AuditAction" ADD VALUE 'CLOSE';
ALTER TYPE "AuditAction" ADD VALUE 'APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'REJECT';

-- AlterEnum
ALTER TYPE "ChequeStatus" ADD VALUE 'DEPOSITED';

-- AlterEnum
ALTER TYPE "CreditPaymentStatus" ADD VALUE 'DEPOSITED';

-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'PROCESSING';

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'DELIVERY';

-- AlterEnum
ALTER TYPE "SafeTransactionType" ADD VALUE 'FUEL_DELIVERY_PAYMENT';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DEVELOPER';

-- DropForeignKey
ALTER TABLE "public"."Shift" DROP CONSTRAINT "Shift_templateId_fkey";

-- DropIndex
DROP INDEX "public"."Price_fuelType_idx";

-- DropIndex
DROP INDEX "public"."Tank_fuelType_idx";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Bank" ADD COLUMN     "accountName" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "swiftCode" TEXT;

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "chequeId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Cheque" ADD COLUMN     "chequeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creditPaymentId" TEXT,
ADD COLUMN     "depositDate" TIMESTAMP(3),
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "recordedBy" TEXT NOT NULL DEFAULT 'System';

-- AlterTable
ALTER TABLE "CreditCustomer" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "CreditPayment" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "CreditSale" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "recordedBy" TEXT NOT NULL DEFAULT 'System';

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "afterMeterReadings" JSONB,
ADD COLUMN     "chequeId" TEXT,
ADD COLUMN     "costPrice" DOUBLE PRECISION,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "paymentStatus" "DeliveryPaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
ADD COLUMN     "totalCost" DOUBLE PRECISION,
ADD COLUMN     "waterLevelAfter" DOUBLE PRECISION,
ADD COLUMN     "waterLevelBefore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "recordedBy" TEXT NOT NULL DEFAULT 'System';

-- AlterTable
ALTER TABLE "LoanExternal" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "LoanPumper" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "MeterAudit" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Nozzle" ADD COLUMN     "meterMax" DOUBLE PRECISION,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "rolloverThreshold" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OfficeStaff" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "OfficeStaffSalaryPayment" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "OilSale" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "recordedBy" TEXT NOT NULL DEFAULT 'System';

-- AlterTable
ALTER TABLE "PosBatch" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PosBatchTerminalEntry" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PosMissingSlip" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PosTerminal" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Price" DROP COLUMN "fuelType",
ADD COLUMN     "fuelId" TEXT NOT NULL,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "updatedBy" TEXT NOT NULL DEFAULT 'System';

-- AlterTable
ALTER TABLE "Pump" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Pumper" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Safe" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SafeTransaction" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SalaryPayment" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "shiftNumber" TEXT,
ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ShiftAssignment" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ShiftTemplate" ADD COLUMN     "breakDuration" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "breakStartTime" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "icon" TEXT DEFAULT 'sun',
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "email" TEXT,
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Tank" DROP COLUMN "fuelType",
ADD COLUMN     "fuelId" TEXT NOT NULL,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TankDip" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TestPour" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lockoutUntil" TIMESTAMP(3),
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- DropEnum
DROP TYPE "public"."FuelType";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'BASIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" "PlanType" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
    "maxStations" INTEGER NOT NULL DEFAULT 1,
    "trialEndDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL,
    "providerTransactionId" TEXT,
    "billingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fuel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "Fuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanOfficeStaff" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyRental" DOUBLE PRECISION DEFAULT 0,
    "reason" TEXT NOT NULL,
    "givenBy" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "LoanOfficeStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPurchaseBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "originalQuantity" DOUBLE PRECISION NOT NULL,
    "currentQuantity" DOUBLE PRECISION NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierId" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,

    CONSTRAINT "ShopPurchaseBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopAssignment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "pumperId" TEXT NOT NULL,
    "pumperName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalShortage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "ShopAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShiftItem" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "openingStock" DOUBLE PRECISION NOT NULL,
    "addedStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingStock" DOUBLE PRECISION,
    "soldQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "organizationId" TEXT,

    CONSTRAINT "ShopShiftItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSale" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,

    CONSTRAINT "ShopSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopWastage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,

    CONSTRAINT "ShopWastage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_organizationId_idx" ON "SubscriptionPayment"("organizationId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_providerTransactionId_idx" ON "SubscriptionPayment"("providerTransactionId");

-- CreateIndex
CREATE INDEX "Fuel_code_idx" ON "Fuel"("code");

-- CreateIndex
CREATE INDEX "Fuel_category_idx" ON "Fuel"("category");

-- CreateIndex
CREATE INDEX "Fuel_isActive_idx" ON "Fuel"("isActive");

-- CreateIndex
CREATE INDEX "Fuel_organizationId_idx" ON "Fuel"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Fuel_code_organizationId_key" ON "Fuel"("code", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Fuel_id_organizationId_key" ON "Fuel"("id", "organizationId");

-- CreateIndex
CREATE INDEX "LoanOfficeStaff_stationId_idx" ON "LoanOfficeStaff"("stationId");

-- CreateIndex
CREATE INDEX "LoanOfficeStaff_status_idx" ON "LoanOfficeStaff"("status");

-- CreateIndex
CREATE INDEX "LoanOfficeStaff_dueDate_idx" ON "LoanOfficeStaff"("dueDate");

-- CreateIndex
CREATE INDEX "LoanOfficeStaff_organizationId_idx" ON "LoanOfficeStaff"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanOfficeStaff_id_organizationId_key" ON "LoanOfficeStaff"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ShopProduct_stationId_idx" ON "ShopProduct"("stationId");

-- CreateIndex
CREATE INDEX "ShopProduct_organizationId_idx" ON "ShopProduct"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProduct_id_organizationId_key" ON "ShopProduct"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ShopPurchaseBatch_productId_idx" ON "ShopPurchaseBatch"("productId");

-- CreateIndex
CREATE INDEX "ShopPurchaseBatch_organizationId_idx" ON "ShopPurchaseBatch"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPurchaseBatch_id_organizationId_key" ON "ShopPurchaseBatch"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopAssignment_shiftId_key" ON "ShopAssignment"("shiftId");

-- CreateIndex
CREATE INDEX "ShopAssignment_organizationId_idx" ON "ShopAssignment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopAssignment_id_organizationId_key" ON "ShopAssignment"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopAssignment_shiftId_organizationId_key" ON "ShopAssignment"("shiftId", "organizationId");

-- CreateIndex
CREATE INDEX "ShopShiftItem_assignmentId_idx" ON "ShopShiftItem"("assignmentId");

-- CreateIndex
CREATE INDEX "ShopShiftItem_productId_idx" ON "ShopShiftItem"("productId");

-- CreateIndex
CREATE INDEX "ShopShiftItem_organizationId_idx" ON "ShopShiftItem"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopShiftItem_id_organizationId_key" ON "ShopShiftItem"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ShopSale_assignmentId_idx" ON "ShopSale"("assignmentId");

-- CreateIndex
CREATE INDEX "ShopSale_productId_idx" ON "ShopSale"("productId");

-- CreateIndex
CREATE INDEX "ShopSale_organizationId_idx" ON "ShopSale"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSale_id_organizationId_key" ON "ShopSale"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ShopWastage_productId_idx" ON "ShopWastage"("productId");

-- CreateIndex
CREATE INDEX "ShopWastage_organizationId_idx" ON "ShopWastage"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopWastage_id_organizationId_key" ON "ShopWastage"("id", "organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_id_organizationId_key" ON "AuditLog"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Bank_isActive_idx" ON "Bank"("isActive");

-- CreateIndex
CREATE INDEX "Bank_organizationId_idx" ON "Bank"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_id_organizationId_key" ON "Bank"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_chequeId_key" ON "BankTransaction"("chequeId");

-- CreateIndex
CREATE INDEX "BankTransaction_organizationId_idx" ON "BankTransaction"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_id_organizationId_key" ON "BankTransaction"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Cheque_creditPaymentId_key" ON "Cheque"("creditPaymentId");

-- CreateIndex
CREATE INDEX "Cheque_chequeDate_idx" ON "Cheque"("chequeDate");

-- CreateIndex
CREATE INDEX "Cheque_organizationId_idx" ON "Cheque"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Cheque_id_organizationId_key" ON "Cheque"("id", "organizationId");

-- CreateIndex
CREATE INDEX "CreditCustomer_organizationId_idx" ON "CreditCustomer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCustomer_id_organizationId_key" ON "CreditCustomer"("id", "organizationId");

-- CreateIndex
CREATE INDEX "CreditPayment_organizationId_idx" ON "CreditPayment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPayment_id_organizationId_key" ON "CreditPayment"("id", "organizationId");

-- CreateIndex
CREATE INDEX "CreditSale_organizationId_idx" ON "CreditSale"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditSale_id_organizationId_key" ON "CreditSale"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Delivery_organizationId_idx" ON "Delivery"("organizationId");

-- CreateIndex
CREATE INDEX "Delivery_paymentStatus_idx" ON "Delivery"("paymentStatus");

-- CreateIndex
CREATE INDEX "Delivery_chequeId_idx" ON "Delivery"("chequeId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_id_organizationId_key" ON "Delivery"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Deposit_organizationId_idx" ON "Deposit"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_id_organizationId_key" ON "Deposit"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Expense_organizationId_idx" ON "Expense"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_id_organizationId_key" ON "Expense"("id", "organizationId");

-- CreateIndex
CREATE INDEX "LoanExternal_organizationId_idx" ON "LoanExternal"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanExternal_id_organizationId_key" ON "LoanExternal"("id", "organizationId");

-- CreateIndex
CREATE INDEX "LoanPumper_stationId_status_idx" ON "LoanPumper"("stationId", "status");

-- CreateIndex
CREATE INDEX "LoanPumper_status_createdAt_idx" ON "LoanPumper"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LoanPumper_organizationId_idx" ON "LoanPumper"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPumper_id_organizationId_key" ON "LoanPumper"("id", "organizationId");

-- CreateIndex
CREATE INDEX "MeterAudit_organizationId_idx" ON "MeterAudit"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MeterAudit_id_organizationId_key" ON "MeterAudit"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Notification_stationId_isRead_idx" ON "Notification"("stationId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_isRead_createdAt_idx" ON "Notification"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_id_organizationId_key" ON "Notification"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Nozzle_pumpId_isActive_idx" ON "Nozzle"("pumpId", "isActive");

-- CreateIndex
CREATE INDEX "Nozzle_organizationId_idx" ON "Nozzle"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Nozzle_id_organizationId_key" ON "Nozzle"("id", "organizationId");

-- CreateIndex
CREATE INDEX "OfficeStaff_organizationId_idx" ON "OfficeStaff"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeStaff_id_organizationId_key" ON "OfficeStaff"("id", "organizationId");

-- CreateIndex
CREATE INDEX "OfficeStaffSalaryPayment_organizationId_idx" ON "OfficeStaffSalaryPayment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeStaffSalaryPayment_id_organizationId_key" ON "OfficeStaffSalaryPayment"("id", "organizationId");

-- CreateIndex
CREATE INDEX "OilSale_organizationId_idx" ON "OilSale"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OilSale_id_organizationId_key" ON "OilSale"("id", "organizationId");

-- CreateIndex
CREATE INDEX "PosBatch_organizationId_idx" ON "PosBatch"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PosBatch_id_organizationId_key" ON "PosBatch"("id", "organizationId");

-- CreateIndex
CREATE INDEX "PosBatchTerminalEntry_organizationId_idx" ON "PosBatchTerminalEntry"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PosBatchTerminalEntry_id_organizationId_key" ON "PosBatchTerminalEntry"("id", "organizationId");

-- CreateIndex
CREATE INDEX "PosMissingSlip_organizationId_idx" ON "PosMissingSlip"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PosMissingSlip_id_organizationId_key" ON "PosMissingSlip"("id", "organizationId");

-- CreateIndex
CREATE INDEX "PosTerminal_organizationId_idx" ON "PosTerminal"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PosTerminal_id_organizationId_key" ON "PosTerminal"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Price_fuelId_idx" ON "Price"("fuelId");

-- CreateIndex
CREATE INDEX "Price_organizationId_idx" ON "Price"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Price_id_organizationId_key" ON "Price"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Pump_stationId_isActive_idx" ON "Pump"("stationId", "isActive");

-- CreateIndex
CREATE INDEX "Pump_organizationId_idx" ON "Pump"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Pump_id_organizationId_key" ON "Pump"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Pumper_stationId_isActive_idx" ON "Pumper"("stationId", "isActive");

-- CreateIndex
CREATE INDEX "Pumper_organizationId_idx" ON "Pumper"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Pumper_id_organizationId_key" ON "Pumper"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Safe_organizationId_idx" ON "Safe"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Safe_id_organizationId_key" ON "Safe"("id", "organizationId");

-- CreateIndex
CREATE INDEX "SafeTransaction_safeId_timestamp_idx" ON "SafeTransaction"("safeId", "timestamp");

-- CreateIndex
CREATE INDEX "SafeTransaction_shiftId_idx" ON "SafeTransaction"("shiftId");

-- CreateIndex
CREATE INDEX "SafeTransaction_organizationId_idx" ON "SafeTransaction"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SafeTransaction_id_organizationId_key" ON "SafeTransaction"("id", "organizationId");

-- CreateIndex
CREATE INDEX "SalaryPayment_organizationId_idx" ON "SalaryPayment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryPayment_id_organizationId_key" ON "SalaryPayment"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Shift_stationId_status_idx" ON "Shift"("stationId", "status");

-- CreateIndex
CREATE INDEX "Shift_status_createdAt_idx" ON "Shift"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Shift_organizationId_idx" ON "Shift"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_id_organizationId_key" ON "Shift"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_shiftId_status_idx" ON "ShiftAssignment"("shiftId", "status");

-- CreateIndex
CREATE INDEX "ShiftAssignment_organizationId_idx" ON "ShiftAssignment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAssignment_id_organizationId_key" ON "ShiftAssignment"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ShiftTemplate_organizationId_idx" ON "ShiftTemplate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTemplate_id_organizationId_key" ON "ShiftTemplate"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Station_organizationId_idx" ON "Station"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Station_id_organizationId_key" ON "Station"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Tank_fuelId_idx" ON "Tank"("fuelId");

-- CreateIndex
CREATE INDEX "Tank_stationId_isActive_idx" ON "Tank"("stationId", "isActive");

-- CreateIndex
CREATE INDEX "Tank_currentLevel_idx" ON "Tank"("currentLevel");

-- CreateIndex
CREATE INDEX "Tank_organizationId_idx" ON "Tank"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Tank_id_organizationId_key" ON "Tank"("id", "organizationId");

-- CreateIndex
CREATE INDEX "TankDip_organizationId_idx" ON "TankDip"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TankDip_id_organizationId_key" ON "TankDip"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Tender_organizationId_idx" ON "Tender"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Tender_id_organizationId_key" ON "Tender"("id", "organizationId");

-- CreateIndex
CREATE INDEX "TestPour_organizationId_idx" ON "TestPour"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TestPour_id_organizationId_key" ON "TestPour"("id", "organizationId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_organizationId_key" ON "User"("id", "organizationId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_fuelId_fkey" FOREIGN KEY ("fuelId") REFERENCES "Fuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fuel" ADD CONSTRAINT "Fuel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pump" ADD CONSTRAINT "Pump_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanExternal" ADD CONSTRAINT "LoanExternal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPumper" ADD CONSTRAINT "LoanPumper_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOfficeStaff" ADD CONSTRAINT "LoanOfficeStaff_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOfficeStaff" ADD CONSTRAINT "LoanOfficeStaff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_creditPaymentId_fkey" FOREIGN KEY ("creditPaymentId") REFERENCES "CreditPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCustomer" ADD CONSTRAINT "CreditCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosBatch" ADD CONSTRAINT "PosBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosBatchTerminalEntry" ADD CONSTRAINT "PosBatchTerminalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosMissingSlip" ADD CONSTRAINT "PosMissingSlip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Safe" ADD CONSTRAINT "Safe_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeTransaction" ADD CONSTRAINT "SafeTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_fuelId_fkey" FOREIGN KEY ("fuelId") REFERENCES "Fuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bank" ADD CONSTRAINT "Bank_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pumper" ADD CONSTRAINT "Pumper_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeStaff" ADD CONSTRAINT "OfficeStaff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeStaffSalaryPayment" ADD CONSTRAINT "OfficeStaffSalaryPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterAudit" ADD CONSTRAINT "MeterAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPour" ADD CONSTRAINT "TestPour_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OilSale" ADD CONSTRAINT "OilSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchaseBatch" ADD CONSTRAINT "ShopPurchaseBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchaseBatch" ADD CONSTRAINT "ShopPurchaseBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopAssignment" ADD CONSTRAINT "ShopAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopAssignment" ADD CONSTRAINT "ShopAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShiftItem" ADD CONSTRAINT "ShopShiftItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ShopAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShiftItem" ADD CONSTRAINT "ShopShiftItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShiftItem" ADD CONSTRAINT "ShopShiftItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSale" ADD CONSTRAINT "ShopSale_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ShopAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSale" ADD CONSTRAINT "ShopSale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ShopPurchaseBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSale" ADD CONSTRAINT "ShopSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSale" ADD CONSTRAINT "ShopSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopWastage" ADD CONSTRAINT "ShopWastage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopWastage" ADD CONSTRAINT "ShopWastage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
