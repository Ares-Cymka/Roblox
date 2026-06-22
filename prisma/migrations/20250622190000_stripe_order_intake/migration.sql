-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CustomerInventoryLogReason" AS ENUM ('ORDER_PAID', 'WITHDRAW_RESERVED', 'WITHDRAW_DELIVERED', 'WITHDRAW_CANCELLED', 'ADMIN_ADJUSTMENT');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'INVENTORY_CREDITED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(12,2);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'usd';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(12,2);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "totalPrice" DECIMAL(12,2);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerInventoryLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "sessionId" TEXT,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" "CustomerInventoryLogReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInventoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX IF NOT EXISTS "Order_customerEmail_idx" ON "Order"("customerEmail");
CREATE INDEX IF NOT EXISTS "Order_sessionId_idx" ON "Order"("sessionId");
CREATE INDEX IF NOT EXISTS "CustomerInventoryLog_customerId_idx" ON "CustomerInventoryLog"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerInventoryLog_sessionId_idx" ON "CustomerInventoryLog"("sessionId");
CREATE INDEX IF NOT EXISTS "CustomerInventoryLog_productId_idx" ON "CustomerInventoryLog"("productId");
CREATE INDEX IF NOT EXISTS "CustomerInventoryLog_orderId_idx" ON "CustomerInventoryLog"("orderId");
CREATE INDEX IF NOT EXISTS "CustomerInventoryLog_reason_idx" ON "CustomerInventoryLog"("reason");
CREATE INDEX IF NOT EXISTS "CustomerInventoryLog_createdAt_idx" ON "CustomerInventoryLog"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CustomerInventoryLog" ADD CONSTRAINT "CustomerInventoryLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerInventoryLog" ADD CONSTRAINT "CustomerInventoryLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerInventoryLog" ADD CONSTRAINT "CustomerInventoryLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
