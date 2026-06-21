-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('MM2', 'ADOPT_ME', 'SAB', 'GAG2', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CLAIM_STARTED', 'QUEUED', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'USERNAME_LINKED', 'ORDER_READY', 'WAITING_FRIEND_REQUEST', 'WAITING_JOIN', 'QUEUED', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY', 'DISABLED');

-- CreateEnum
CREATE TYPE "BotAssignmentStatus" AS ENUM ('ASSIGNED', 'FRIEND_REQUEST_PENDING', 'FRIEND_REQUEST_SENT', 'READY_TO_JOIN', 'IN_GAME', 'DELIVERING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'WAITING_USER', 'DELIVERED', 'FAILED', 'RETRYING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "robloxUsername" TEXT,
    "robloxUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "game" "GameType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "rarity" TEXT,
    "value" DECIMAL(12,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimCode" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "robloxUsername" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimItem" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotAccount" (
    "id" TEXT NOT NULL,
    "game" "GameType" NOT NULL,
    "robloxUsername" TEXT NOT NULL,
    "robloxUserId" TEXT,
    "avatarUrl" TEXT,
    "profileUrl" TEXT NOT NULL,
    "privateServerUrl" TEXT,
    "status" "BotStatus" NOT NULL DEFAULT 'OFFLINE',
    "maxConcurrentDeliveries" INTEGER NOT NULL DEFAULT 1,
    "currentDeliveries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotInventory" (
    "id" TEXT NOT NULL,
    "botAccountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotAssignment" (
    "id" TEXT NOT NULL,
    "botAccountId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "status" "BotAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryJob" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLog" (
    "id" TEXT NOT NULL,
    "deliveryJobId" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLog" (
    "id" TEXT NOT NULL,
    "botInventoryId" TEXT,
    "botAccountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT,
    "response" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_token_idx" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_robloxUsername_idx" ON "Customer"("robloxUsername");

-- CreateIndex
CREATE INDEX "Customer_robloxUserId_idx" ON "Customer"("robloxUserId");

-- CreateIndex
CREATE INDEX "Product_game_idx" ON "Product"("game");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_game_itemId_key" ON "Product"("game", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimCode_key" ON "Claim"("claimCode");

-- CreateIndex
CREATE INDEX "Claim_orderId_idx" ON "Claim"("orderId");

-- CreateIndex
CREATE INDEX "Claim_customerId_idx" ON "Claim"("customerId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- CreateIndex
CREATE INDEX "Claim_robloxUsername_idx" ON "Claim"("robloxUsername");

-- CreateIndex
CREATE INDEX "Claim_expiresAt_idx" ON "Claim"("expiresAt");

-- CreateIndex
CREATE INDEX "ClaimItem_claimId_idx" ON "ClaimItem"("claimId");

-- CreateIndex
CREATE INDEX "ClaimItem_productId_idx" ON "ClaimItem"("productId");

-- CreateIndex
CREATE INDEX "ClaimItem_orderItemId_idx" ON "ClaimItem"("orderItemId");

-- CreateIndex
CREATE INDEX "BotAccount_game_idx" ON "BotAccount"("game");

-- CreateIndex
CREATE INDEX "BotAccount_status_idx" ON "BotAccount"("status");

-- CreateIndex
CREATE INDEX "BotAccount_robloxUserId_idx" ON "BotAccount"("robloxUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BotAccount_game_robloxUsername_key" ON "BotAccount"("game", "robloxUsername");

-- CreateIndex
CREATE INDEX "BotInventory_botAccountId_idx" ON "BotInventory"("botAccountId");

-- CreateIndex
CREATE INDEX "BotInventory_productId_idx" ON "BotInventory"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BotInventory_botAccountId_productId_key" ON "BotInventory"("botAccountId", "productId");

-- CreateIndex
CREATE INDEX "BotAssignment_botAccountId_idx" ON "BotAssignment"("botAccountId");

-- CreateIndex
CREATE INDEX "BotAssignment_claimId_idx" ON "BotAssignment"("claimId");

-- CreateIndex
CREATE INDEX "BotAssignment_status_idx" ON "BotAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryJob_claimId_key" ON "DeliveryJob"("claimId");

-- CreateIndex
CREATE INDEX "DeliveryJob_status_idx" ON "DeliveryJob"("status");

-- CreateIndex
CREATE INDEX "DeliveryJob_createdAt_idx" ON "DeliveryJob"("createdAt");

-- CreateIndex
CREATE INDEX "DeliveryJob_lockedAt_idx" ON "DeliveryJob"("lockedAt");

-- CreateIndex
CREATE INDEX "DeliveryLog_deliveryJobId_idx" ON "DeliveryLog"("deliveryJobId");

-- CreateIndex
CREATE INDEX "DeliveryLog_level_idx" ON "DeliveryLog"("level");

-- CreateIndex
CREATE INDEX "DeliveryLog_createdAt_idx" ON "DeliveryLog"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryLog_botInventoryId_idx" ON "InventoryLog"("botInventoryId");

-- CreateIndex
CREATE INDEX "InventoryLog_botAccountId_idx" ON "InventoryLog"("botAccountId");

-- CreateIndex
CREATE INDEX "InventoryLog_productId_idx" ON "InventoryLog"("productId");

-- CreateIndex
CREATE INDEX "InventoryLog_createdAt_idx" ON "InventoryLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_scope_idx" ON "IdempotencyKey"("scope");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimItem" ADD CONSTRAINT "ClaimItem_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimItem" ADD CONSTRAINT "ClaimItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimItem" ADD CONSTRAINT "ClaimItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotInventory" ADD CONSTRAINT "BotInventory_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "BotAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotInventory" ADD CONSTRAINT "BotInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotAssignment" ADD CONSTRAINT "BotAssignment_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "BotAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotAssignment" ADD CONSTRAINT "BotAssignment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryJob" ADD CONSTRAINT "DeliveryJob_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLog" ADD CONSTRAINT "DeliveryLog_deliveryJobId_fkey" FOREIGN KEY ("deliveryJobId") REFERENCES "DeliveryJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_botInventoryId_fkey" FOREIGN KEY ("botInventoryId") REFERENCES "BotInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "BotAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
