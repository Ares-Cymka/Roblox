import { DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DeliveryJobPayload, IBotController } from "../types";

/**
 * ManualBotController
 *
 * This is the default controller used in production when no automated
 * bot agent is available. It sets the delivery job to PROCESSING and
 * leaves it for an admin to manually confirm via the admin dashboard.
 *
 * Flow:
 * 1. Job arrives in QUEUED state.
 * 2. ManualBotController transitions it to PROCESSING and logs instructions.
 * 3. Admin views /admin/deliveries, performs the in-game delivery manually.
 * 4. Admin clicks "Mark Delivered" or "Mark Failed".
 * 5. admin-delivery.ts service handles the final status update.
 */
export class ManualBotController implements IBotController {
  readonly name = "ManualBotController";

  async dispatch(payload: DeliveryJobPayload): Promise<void> {
    const { jobId, game, deliveryMethod, customerRobloxUsername, botRobloxUsername, items } = payload;

    const itemsSummary = items
      .map((i) => `${i.name} ×${i.quantity}`)
      .join(", ");

    await prisma.$transaction(async (tx) => {
      await tx.deliveryJob.update({
        where: { id: jobId },
        data: { status: DeliveryStatus.PROCESSING, lockedAt: new Date() },
      });

      await tx.deliveryLog.create({
        data: {
          deliveryJobId: jobId,
          withdrawalId: payload.withdrawalId,
          claimId: payload.claimId,
          message:
            `[MANUAL] Delivery job dispatched to manual queue. ` +
            `Game: ${game}, Method: ${deliveryMethod}. ` +
            `Customer: ${customerRobloxUsername}, Bot: ${botRobloxUsername}. ` +
            `Items: ${itemsSummary}. ` +
            `Awaiting admin confirmation.`,
        },
      });
    });
  }
}
