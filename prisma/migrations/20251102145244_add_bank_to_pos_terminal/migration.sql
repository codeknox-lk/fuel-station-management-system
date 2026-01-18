-- AlterTable
ALTER TABLE "PosTerminal" ADD COLUMN     "bankId" TEXT;

-- CreateIndex
CREATE INDEX "PosTerminal_bankId_idx" ON "PosTerminal"("bankId");

-- AddForeignKey
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
