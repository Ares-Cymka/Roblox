import { DeliveryStatus, WithdrawalStatus, BotAssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DeliveryJobPayload, IBotController } from "../types";

/**
 * MockBotController
 *
 * Used when DELIVERY_ADAPTER=mock (local development / integration testing).
 * Simulates the full delivery lifecycle automatically without any real
 * Roblox interaction.
 *
 * Flow:
 * 1. Job is dispatched.
 * 2. Controller logs "bot joining game" after 1 s.
 * 3. Controller logs "bot performing delivery" after another 2 s.
 * 4. Controller marks the job DELIVERED and the withdrawal DELIVERED.
 *
 * No Roblox credentials, cookies, or API calls are made.
 */
export class MockBotController implements IBotController {
  readonly name = "MockBotController";

  async dispatch(payload: DeliveryJobPayload): Promise<void> {
    const { jobId } = payload;

    // Log dispatch immediately
    await prisma.deliveryLog.create({
      data: {
        deliveryJobId: jobId,
        withdrawalId: payload.withdrawalId,
        claimId: payload.claimId,
        message: `[MOCK] Delivery simulation started. Bot: ${payload.botRobloxUsername}, Customer: ${payload.customerRobloxUsername}`,
      },
    });

    // Run the simulation asynchronously so the caller gets a fast response
    void this.runSimulation(payload);
  }

  private async runSimulation(payload: DeliveryJobPayload): Promise<void> {
    const { jobId } = payload;

    try {
      await delay(1000);

      await prisma.deliveryLog.create({
        data: {
          deliveryJobId: jobId,
          withdrawalId: payload.withdrawalId,
          claimId: payload.claimId,
          message: `[MOCK] Simulated bot joining ${payload.game} game server.`,
        },
      });

      await delay(2000);

      await prisma.deliveryLog.create({
        data: {
          deliveryJobId: jobId,
          withdrawalId: payload.withdrawalId,
          claimId: payload.claimId,
          message: `[MOCK] Simulated ${payload.deliveryMethod} delivery in progress — items: ${payload.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}`,
        },
      });

      await delay(2000);

      // Mark everything as delivered
      await prisma.$transaction(async (tx) => {
        await tx.deliveryJob.update({
          where: { id: jobId },
          data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
        });

        if (payload.withdrawalId) {
          await tx.withdrawal.update({
            where: { id: payload.withdrawalId },
            data: { status: WithdrawalStatus.DELIVERED },
          });

          const assignment = await tx.botAssignment.findFirst({
            where: { withdrawalId: payload.withdrawalId },
          });
          if (assignment) {
            await tx.botAssignment.update({
              where: { id: assignment.id },
              data: { status: BotAssignmentStatus.COMPLETED, completedAt: new Date() },
            });
          }
        }

        await tx.deliveryLog.create({
          data: {
            deliveryJobId: jobId,
            withdrawalId: payload.withdrawalId,
            claimId: payload.claimId,
            message: `[MOCK] Delivery simulation completed successfully.`,
            proofText: `Mock delivery completed for customer ${payload.customerRobloxUsername} via ${payload.deliveryMethod}.`,
          },
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.deliveryJob.update({
        where: { id: jobId },
        data: { status: DeliveryStatus.FAILED, lastError: message },
      }).catch(() => {});
      await prisma.deliveryLog.create({
        data: {
          deliveryJobId: jobId,
          withdrawalId: payload.withdrawalId,
          claimId: payload.claimId,
          level: "ERROR",
          message: `[MOCK] Simulation failed: ${message}`,
        },
      }).catch(() => {});
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
