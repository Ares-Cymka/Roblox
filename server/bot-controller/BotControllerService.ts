import { BotControllerType, DeliveryStatus, GameType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DeliveryJobPayload, IBotController } from "./types";
import { ManualBotController } from "./controllers/ManualBotController";
import { MockBotController } from "./controllers/MockBotController";
import { getGameAdapter } from "./adapters";

/**
 * BotControllerService
 *
 * Central orchestrator for the delivery automation layer.
 *
 * Architecture:
 *
 *   Website/Backend  ──►  BotControllerService
 *                               │
 *                   ┌──────────┬┴──────────────┐
 *                   │          │               │
 *             ManualBotController  MockBotController  AUTO
 *            (admin confirms)   (simulates)     │
 *                                         GameAutomationAdapter
 *                                         (MM2/AdoptMe/SAB/GAG2)
 *
 * Selecting the controller:
 * - If DELIVERY_ADAPTER env is "mock" → MockBotController
 * - Otherwise uses the controllerType stored on the DeliveryJob:
 *   - MANUAL → ManualBotController (default for production)
 *   - MOCK   → MockBotController
 *   - AUTO   → GameAutomationAdapter (placeholder, throws until implemented)
 */

const manualController = new ManualBotController();
const mockController = new MockBotController();

function selectController(controllerType: BotControllerType): IBotController {
  const adapterEnv = process.env.DELIVERY_ADAPTER?.trim();
  if (adapterEnv === "mock") return mockController;

  switch (controllerType) {
    case BotControllerType.MOCK:
      return mockController;
    case BotControllerType.AUTO:
      // AUTO delegates to ManualBotController until a real adapter is confirmed
      // The game adapter will be called by the external bot agent via /api/bot/* endpoints
      return manualController;
    case BotControllerType.MANUAL:
    default:
      return manualController;
  }
}

/**
 * Dispatch a newly QUEUED delivery job to the appropriate controller.
 * Called after a bot is assigned and a DeliveryJob is created.
 */
export async function dispatchDeliveryJob(jobId: string): Promise<void> {
  const job = await prisma.deliveryJob.findUnique({
    where: { id: jobId },
    include: {
      withdrawal: {
        include: {
          items: { include: { product: true } },
          botAssignments: {
            include: { botAccount: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      claim: {
        include: {
          items: { include: { product: true } },
          botAssignments: {
            include: { botAccount: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!job) throw new Error(`DeliveryJob not found: ${jobId}`);
  if (job.status !== DeliveryStatus.QUEUED) {
    // Already dispatched or in a terminal state — skip
    return;
  }

  const withdrawal = job.withdrawal;
  const claim = job.claim;
  const source = withdrawal ?? claim;
  if (!source) throw new Error(`DeliveryJob ${jobId} has no withdrawal or claim`);

  const assignment =
    withdrawal?.botAssignments[0] ?? claim?.botAssignments[0];
  if (!assignment) throw new Error(`No BotAssignment found for job ${jobId}`);

  const robloxUsername =
    withdrawal?.robloxUsername ?? claim?.robloxUsername ?? null;
  if (!robloxUsername) throw new Error(`No Roblox username set for job ${jobId}`);

  // Build game type from items
  const firstProduct =
    (withdrawal?.items[0]?.product ?? claim?.items[0]?.product);
  const game: GameType = (firstProduct?.game ?? "OTHER") as GameType;

  // Build delivery config
  const gameConfig = await prisma.gameDeliveryConfig.findUnique({
    where: { game: game as GameType },
  });

  const items =
    withdrawal?.items.map((wi) => ({
      productId: wi.productId,
      name: wi.product.name,
      quantity: wi.quantity,
      unitValue: wi.unitValue ? Number(wi.unitValue) : 0,
    })) ??
    claim?.items.map((ci) => ({
      productId: ci.productId,
      name: ci.product.name,
      quantity: ci.quantity,
      unitValue: 0,
    })) ??
    [];

  const payload: DeliveryJobPayload = {
    jobId,
    withdrawalId: job.withdrawalId,
    claimId: job.claimId,
    game,
    deliveryMethod: gameConfig?.deliveryMethod ?? "MANUAL",
    customerRobloxUsername: robloxUsername,
    botRobloxUsername: assignment.botAccount.robloxUsername,
    botProfileUrl: assignment.botAccount.profileUrl,
    botPrivateServerUrl: assignment.botAccount.privateServerUrl,
    items,
    requiresFriend: gameConfig?.requiresFriend ?? false,
    requiresCustomerJoin: gameConfig?.requiresCustomerJoin ?? false,
    controllerType: job.controllerType,
    attemptNumber: job.attempts + 1,
  };

  const controller = selectController(job.controllerType);
  await controller.dispatch(payload);
}

/**
 * Determine which BotControllerType to use when creating a new DeliveryJob.
 *
 * DELIVERY_ADAPTER=manual (default) → MANUAL  (admin confirms in dashboard)
 * DELIVERY_ADAPTER=mock             → MOCK    (simulated delivery, for dev/testing)
 * DELIVERY_ADAPTER=auto             → AUTO    (game adapter, placeholder until client confirms)
 */
export function resolveControllerType(): BotControllerType {
  const adapterEnv = process.env.DELIVERY_ADAPTER?.trim();
  if (adapterEnv === "mock") return BotControllerType.MOCK;
  if (adapterEnv === "auto") return BotControllerType.AUTO;
  return BotControllerType.MANUAL;
}
