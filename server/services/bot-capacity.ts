import {
  BotAssignmentStatus,
  DeliveryStatus,
  GameType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TERMINAL_ASSIGNMENT_STATUSES: BotAssignmentStatus[] = [
  BotAssignmentStatus.COMPLETED,
  BotAssignmentStatus.FAILED,
  BotAssignmentStatus.CANCELLED,
];

export async function countActiveBotAssignments(botAccountId: string) {
  return prisma.botAssignment.count({
    where: {
      botAccountId,
      status: { notIn: TERMINAL_ASSIGNMENT_STATUSES },
    },
  });
}

export async function syncBotCurrentDeliveries(botAccountId: string) {
  const activeCount = await countActiveBotAssignments(botAccountId);
  await prisma.botAccount.update({
    where: { id: botAccountId },
    data: { currentDeliveries: activeCount },
  });
  return activeCount;
}

export async function syncGameBotCapacities(game: GameType) {
  const bots = await prisma.botAccount.findMany({
    where: { game },
    select: { id: true },
  });

  await Promise.all(bots.map((bot) => syncBotCurrentDeliveries(bot.id)));
}

type AssignmentWithItems = Prisma.BotAssignmentGetPayload<{
  include: {
    botAccount: true;
    withdrawal: { include: { items: true } };
    claim: { include: { items: true } };
  };
}>;

async function loadAssignmentForRelease(assignmentId: string) {
  return prisma.botAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      botAccount: true,
      withdrawal: { include: { items: true } },
      claim: { include: { items: true } },
    },
  });
}

export async function releaseBotAssignmentCapacity(
  assignmentId: string,
  status: BotAssignmentStatus = BotAssignmentStatus.CANCELLED
) {
  const assignment = await loadAssignmentForRelease(assignmentId);
  if (!assignment) return false;

  if (TERMINAL_ASSIGNMENT_STATUSES.includes(assignment.status)) {
    await syncBotCurrentDeliveries(assignment.botAccountId);
    return false;
  }

  const reservedItems =
    assignment.withdrawal?.items ?? assignment.claim?.items ?? [];

  await prisma.$transaction(async (tx) => {
    await tx.botAssignment.update({
      where: { id: assignment.id },
      data: {
        status,
        completedAt: new Date(),
      },
    });

    for (const item of reservedItems) {
      const inventory = await tx.botInventory.findUnique({
        where: {
          botAccountId_productId: {
            botAccountId: assignment.botAccountId,
            productId: item.productId,
          },
        },
      });

      if (!inventory) continue;

      const nextReserved = Math.max(
        0,
        inventory.reservedQuantity - item.quantity
      );

      await tx.botInventory.update({
        where: { id: inventory.id },
        data: { reservedQuantity: nextReserved },
      });
    }
  });

  await syncBotCurrentDeliveries(assignment.botAccountId);
  return true;
}

export async function finalizeDeliveryJobCapacity(
  deliveryJobId: string,
  outcome: "delivered" | "failed"
) {
  const job = await prisma.deliveryJob.findUnique({
    where: { id: deliveryJobId },
    include: {
      withdrawal: {
        include: {
          items: true,
          botAssignments: { orderBy: { assignedAt: "desc" }, take: 1 },
        },
      },
      claim: {
        include: {
          items: true,
          botAssignments: { orderBy: { assignedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!job) return;

  const assignment =
    job.withdrawal?.botAssignments[0] ?? job.claim?.botAssignments[0];
  if (!assignment) return;

  const assignmentStatus =
    outcome === "delivered"
      ? BotAssignmentStatus.COMPLETED
      : BotAssignmentStatus.FAILED;

  await releaseBotAssignmentCapacity(assignment.id, assignmentStatus);

  if (outcome === "delivered") {
    const items = job.withdrawal?.items ?? job.claim?.items ?? [];
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const inventory = await tx.botInventory.findUnique({
          where: {
            botAccountId_productId: {
              botAccountId: assignment.botAccountId,
              productId: item.productId,
            },
          },
        });

        if (!inventory) continue;

        await tx.botInventory.update({
          where: { id: inventory.id },
          data: {
            quantity: { decrement: item.quantity },
          },
        });
      }
    });
  }
}

export async function findBlockingBotDelivery(game: GameType) {
  const assignment = await prisma.botAssignment.findFirst({
    where: {
      status: { notIn: TERMINAL_ASSIGNMENT_STATUSES },
      botAccount: { game },
    },
    orderBy: { assignedAt: "desc" },
    include: {
      withdrawal: { select: { withdrawalCode: true, status: true } },
      claim: { select: { claimCode: true, status: true } },
      botAccount: { select: { robloxUsername: true } },
    },
  });

  if (!assignment) return null;

  return {
    botUsername: assignment.botAccount.robloxUsername,
    withdrawalCode: assignment.withdrawal?.withdrawalCode ?? null,
    claimCode: assignment.claim?.claimCode ?? null,
    withdrawalStatus: assignment.withdrawal?.status ?? null,
    claimStatus: assignment.claim?.status ?? null,
  };
}

export async function cancelDeliveryJob(
  deliveryJobId: string,
  tx: Prisma.TransactionClient
) {
  await tx.deliveryJob.update({
    where: { id: deliveryJobId },
    data: { status: DeliveryStatus.CANCELLED },
  });
}
