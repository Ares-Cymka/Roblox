import { prisma } from "@/lib/prisma";

/**
 * Returns true if this Stripe event ID has already been processed.
 * Used for idempotency — prevents double-processing retried webhook deliveries.
 */
export async function stripeEventAlreadyProcessed(stripeEventId: string): Promise<boolean> {
  const existing = await prisma.stripeEvent.findUnique({
    where: { stripeEventId },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Records a Stripe event as processed.
 * Safe to call even if a race condition causes a duplicate — unique constraint handles it.
 */
export async function recordStripeEvent(stripeEventId: string, eventType: string): Promise<void> {
  try {
    await prisma.stripeEvent.create({
      data: { stripeEventId, eventType },
    });
  } catch {
    // Unique constraint violation means another process already recorded it — safe to ignore.
  }
}
