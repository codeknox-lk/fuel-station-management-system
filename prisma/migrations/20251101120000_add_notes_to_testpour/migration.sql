-- AlterTable
-- Add notes column to TestPour table if it doesn't exist
ALTER TABLE "TestPour" ADD COLUMN IF NOT EXISTS "notes" TEXT;

