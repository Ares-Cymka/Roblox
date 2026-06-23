-- CreateEnum
CREATE TYPE "BotControllerType" AS ENUM ('MANUAL', 'MOCK', 'AUTO');

-- CreateEnum
CREATE TYPE "BotSessionStatus" AS ENUM ('IDLE', 'ACTIVE', 'BUSY', 'ERROR', 'OFFLINE');

-- DropIndex
DROP INDEX "DeliveryJob_nextRetryAt_idx";

-- AlterTable
ALTER TABLE "DeliveryJob" ADD COLUMN     "controllerType" "BotControllerType" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "BotSession" (
    "id" TEXT NOT NULL,
    "botAccountId" TEXT NOT NULL,
    "status" "BotSessionStatus" NOT NULL DEFAULT 'IDLE',
    "currentJobId" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotSession_botAccountId_key" ON "BotSession"("botAccountId");

-- CreateIndex
CREATE INDEX "BotSession_status_idx" ON "BotSession"("status");

-- CreateIndex
CREATE INDEX "BotSession_lastHeartbeatAt_idx" ON "BotSession"("lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "DeliveryJob_controllerType_idx" ON "DeliveryJob"("controllerType");

-- AddForeignKey
ALTER TABLE "BotSession" ADD CONSTRAINT "BotSession_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "BotAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
