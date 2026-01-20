-- Migration: Convert FuelType from enum to table
-- This migration must be run manually or through a custom migration script

-- Step 1: Create the FuelType table
CREATE TABLE IF NOT EXISTS "FuelType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Step 2: Insert default fuel types
INSERT INTO "FuelType" ("id", "code", "name", "category", "icon", "sortOrder", "updatedAt") VALUES
    (gen_random_uuid(), 'PETROL_92', 'Petrol 92', 'PETROL', '⛽', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PETROL_95', 'Petrol 95', 'PETROL', '⛽', 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PETROL_EURO_3', 'Petrol Euro 3', 'PETROL', '🚗', 3, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'DIESEL', 'Diesel', 'DIESEL', '🚛', 4, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SUPER_DIESEL', 'Super Diesel', 'DIESEL', '🚚', 5, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'EXTRA_MILE', 'Extra Mile', 'PETROL', '⭐', 6, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'OIL', 'Oil', 'OIL', '🛢️', 7, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Step 3: Add fuelTypeId column to Tank (temporary nullable)
ALTER TABLE "Tank" ADD COLUMN IF NOT EXISTS "fuelTypeId" TEXT;

-- Step 4: Migrate Tank data
UPDATE "Tank" t
SET "fuelTypeId" = ft."id"
FROM "FuelType" ft
WHERE t."fuelType"::TEXT = ft."code";

-- Step 5: Add fuelTypeId column to Price (temporary nullable)
ALTER TABLE "Price" ADD COLUMN IF NOT EXISTS "fuelTypeId" TEXT;

-- Step 6: Migrate Price data
UPDATE "Price" p
SET "fuelTypeId" = ft."id"
FROM "FuelType" ft
WHERE p."fuelType"::TEXT = ft."code";

-- Step 7: Create indexes on FuelType
CREATE INDEX IF NOT EXISTS "FuelType_code_idx" ON "FuelType"("code");
CREATE INDEX IF NOT EXISTS "FuelType_category_idx" ON "FuelType"("category");
CREATE INDEX IF NOT EXISTS "FuelType_isActive_idx" ON "FuelType"("isActive");

-- Step 8: Make fuelTypeId NOT NULL and add foreign keys (after data migration)
ALTER TABLE "Tank" ALTER COLUMN "fuelTypeId" SET NOT NULL;
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "FuelType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Tank_fuelTypeId_idx" ON "Tank"("fuelTypeId");

ALTER TABLE "Price" ALTER COLUMN "fuelTypeId" SET NOT NULL;
ALTER TABLE "Price" ADD CONSTRAINT "Price_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "FuelType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Price_fuelTypeId_idx" ON "Price"("fuelTypeId");

-- Step 9: Drop old enum columns
ALTER TABLE "Tank" DROP COLUMN IF EXISTS "fuelType";
ALTER TABLE "Price" DROP COLUMN IF EXISTS "fuelType";

-- Step 10: Drop the old FuelType enum (if exists)
-- Note: This might fail if there are other dependencies
-- DROP TYPE IF EXISTS "FuelType";
