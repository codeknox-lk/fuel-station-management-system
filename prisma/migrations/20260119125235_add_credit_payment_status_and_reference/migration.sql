-- CreateEnum
CREATE TYPE "CreditPaymentStatus" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED');

-- AlterTable
ALTER TABLE "CreditPayment" ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "status" "CreditPaymentStatus" NOT NULL DEFAULT 'CLEARED';
