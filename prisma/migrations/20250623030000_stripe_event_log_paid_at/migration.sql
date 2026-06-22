-- CreateTable: StripeEvent idempotency log
CREATE TABLE IF NOT EXISTS "StripeEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StripeEvent_stripeEventId_key" ON "StripeEvent"("stripeEventId");
CREATE INDEX IF NOT EXISTS "StripeEvent_stripeEventId_idx" ON "StripeEvent"("stripeEventId");
CREATE INDEX IF NOT EXISTS "StripeEvent_eventType_idx" ON "StripeEvent"("eventType");
CREATE INDEX IF NOT EXISTS "StripeEvent_processedAt_idx" ON "StripeEvent"("processedAt");

-- AlterTable: add paidAt and stripeCustomerId to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
