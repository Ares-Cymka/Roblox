-- AlterEnum: add EXPIRED to WithdrawalStatus
ALTER TYPE "WithdrawalStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- AlterTable: add averageDeliveryMinutes to GameDeliveryConfig
ALTER TABLE "GameDeliveryConfig" ADD COLUMN IF NOT EXISTS "averageDeliveryMinutes" INTEGER NOT NULL DEFAULT 5;

-- AlterTable: add retry fields to DeliveryJob
ALTER TABLE "DeliveryJob" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3);
ALTER TABLE "DeliveryJob" ADD COLUMN IF NOT EXISTS "retryReason" TEXT;

-- CreateIndex for nextRetryAt
CREATE INDEX IF NOT EXISTS "DeliveryJob_nextRetryAt_idx" ON "DeliveryJob"("nextRetryAt");
