-- AlterTable: add proof fields to DeliveryLog
ALTER TABLE "DeliveryLog" ADD COLUMN IF NOT EXISTS "proofText" TEXT;
ALTER TABLE "DeliveryLog" ADD COLUMN IF NOT EXISTS "proofImageUrl" TEXT;

-- CreateTable: SupportNote
CREATE TABLE IF NOT EXISTS "SupportNote" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportNote_withdrawalId_idx" ON "SupportNote"("withdrawalId");
CREATE INDEX IF NOT EXISTS "SupportNote_adminUserId_idx" ON "SupportNote"("adminUserId");
CREATE INDEX IF NOT EXISTS "SupportNote_createdAt_idx" ON "SupportNote"("createdAt");

-- AddForeignKey
ALTER TABLE "SupportNote" ADD CONSTRAINT "SupportNote_withdrawalId_fkey"
    FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportNote" ADD CONSTRAINT "SupportNote_adminUserId_fkey"
    FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
