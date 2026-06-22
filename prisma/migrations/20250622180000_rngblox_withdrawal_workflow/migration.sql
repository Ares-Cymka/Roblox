-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('TRADING', 'GIFTING', 'MAILBOX', 'JOIN_BASED', 'MANUAL');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'USERNAME_REQUIRED', 'QUEUED', 'WAITING_FRIEND_REQUEST', 'WAITING_JOIN', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED', 'SUPPORT_REQUIRED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "testCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_testCode_key" ON "Customer"("testCode");
CREATE INDEX "Customer_testCode_idx" ON "Customer"("testCode");

-- CreateTable
CREATE TABLE "GameDeliveryConfig" (
    "id" TEXT NOT NULL,
    "game" "GameType" NOT NULL,
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "requiresFriend" BOOLEAN NOT NULL DEFAULT false,
    "requiresPrivateServer" BOOLEAN NOT NULL DEFAULT false,
    "requiresCustomerJoin" BOOLEAN NOT NULL DEFAULT false,
    "requiresManualConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameDeliveryConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameDeliveryConfig_game_key" ON "GameDeliveryConfig"("game");

-- CreateTable
CREATE TABLE "CustomerInventory" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "sessionId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "sourceOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerInventory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerInventory_customerId_idx" ON "CustomerInventory"("customerId");
CREATE INDEX "CustomerInventory_sessionId_idx" ON "CustomerInventory"("sessionId");
CREATE INDEX "CustomerInventory_productId_idx" ON "CustomerInventory"("productId");
CREATE INDEX "CustomerInventory_sourceOrderId_idx" ON "CustomerInventory"("sourceOrderId");

ALTER TABLE "CustomerInventory" ADD CONSTRAINT "CustomerInventory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInventory" ADD CONSTRAINT "CustomerInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerInventory" ADD CONSTRAINT "CustomerInventory_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "withdrawalCode" TEXT NOT NULL,
    "customerId" TEXT,
    "sessionId" TEXT,
    "robloxUsername" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "totalValue" DECIMAL(12,2) NOT NULL,
    "supportReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Withdrawal_withdrawalCode_key" ON "Withdrawal"("withdrawalCode");
CREATE INDEX "Withdrawal_customerId_idx" ON "Withdrawal"("customerId");
CREATE INDEX "Withdrawal_sessionId_idx" ON "Withdrawal"("sessionId");
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX "Withdrawal_robloxUsername_idx" ON "Withdrawal"("robloxUsername");

ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "WithdrawalItem" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WithdrawalItem_withdrawalId_idx" ON "WithdrawalItem"("withdrawalId");
CREATE INDEX "WithdrawalItem_productId_idx" ON "WithdrawalItem"("productId");

ALTER TABLE "WithdrawalItem" ADD CONSTRAINT "WithdrawalItem_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WithdrawalItem" ADD CONSTRAINT "WithdrawalItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Alter BotAssignment
ALTER TABLE "BotAssignment" ALTER COLUMN "claimId" DROP NOT NULL;
ALTER TABLE "BotAssignment" ADD COLUMN "withdrawalId" TEXT;
CREATE INDEX "BotAssignment_withdrawalId_idx" ON "BotAssignment"("withdrawalId");
ALTER TABLE "BotAssignment" ADD CONSTRAINT "BotAssignment_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Alter DeliveryJob
ALTER TABLE "DeliveryJob" ALTER COLUMN "claimId" DROP NOT NULL;
ALTER TABLE "DeliveryJob" ADD COLUMN "withdrawalId" TEXT;
CREATE UNIQUE INDEX "DeliveryJob_withdrawalId_key" ON "DeliveryJob"("withdrawalId");

ALTER TABLE "DeliveryJob" ADD CONSTRAINT "DeliveryJob_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Alter DeliveryLog
ALTER TABLE "DeliveryLog" ADD COLUMN "claimId" TEXT;
ALTER TABLE "DeliveryLog" ADD COLUMN "withdrawalId" TEXT;
CREATE INDEX "DeliveryLog_claimId_idx" ON "DeliveryLog"("claimId");
CREATE INDEX "DeliveryLog_withdrawalId_idx" ON "DeliveryLog"("withdrawalId");
