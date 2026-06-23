-- CreateEnum
CREATE TYPE "MM2SessionStatus" AS ENUM ('WAITING_FRIEND', 'WAITING_CUSTOMER_JOIN', 'CUSTOMER_IN_SERVER', 'OPERATOR_READY', 'TRADE_SENT', 'TRADE_ACCEPTED', 'DELIVERED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "BotAssignment" ADD COLUMN     "customerJoinedAt" TIMESTAMP(3),
ADD COLUMN     "operatorReadyAt" TIMESTAMP(3),
ADD COLUMN     "tradeStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MM2DeliverySession" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "botAccountId" TEXT NOT NULL,
    "customerRobloxUsername" TEXT NOT NULL,
    "privateServerUrl" TEXT,
    "status" "MM2SessionStatus" NOT NULL DEFAULT 'WAITING_FRIEND',
    "customerJoinedAt" TIMESTAMP(3),
    "operatorReadyAt" TIMESTAMP(3),
    "tradeStartedAt" TIMESTAMP(3),
    "tradeCompletedAt" TIMESTAMP(3),
    "tradeFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MM2DeliverySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MM2DeliverySession_withdrawalId_key" ON "MM2DeliverySession"("withdrawalId");

-- CreateIndex
CREATE INDEX "MM2DeliverySession_withdrawalId_idx" ON "MM2DeliverySession"("withdrawalId");

-- CreateIndex
CREATE INDEX "MM2DeliverySession_botAccountId_idx" ON "MM2DeliverySession"("botAccountId");

-- CreateIndex
CREATE INDEX "MM2DeliverySession_status_idx" ON "MM2DeliverySession"("status");

-- CreateIndex
CREATE INDEX "MM2DeliverySession_createdAt_idx" ON "MM2DeliverySession"("createdAt");

-- AddForeignKey
ALTER TABLE "MM2DeliverySession" ADD CONSTRAINT "MM2DeliverySession_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MM2DeliverySession" ADD CONSTRAINT "MM2DeliverySession_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "BotAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
