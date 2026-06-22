import {
  BotAssignmentStatus,
  DeliveryMethod,
  DeliveryStatus,
  GameType,
  Prisma,
  WithdrawalStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncBotCurrentDeliveries } from "@/server/services/bot-capacity";
import { getGameDeliveryConfig } from "@/server/services/game-delivery-config";

export const TRADING_OPERATOR_INSTRUCTIONS = [
  "Login to the assigned Roblox bot account manually.",
  "Join the correct game or private server.",
  "Find the customer username.",
  "Send trade request.",
  "Transfer the listed items.",
  "After trade succeeds, click Mark Delivered.",
];

export const MAILBOX_OPERATOR_INSTRUCTIONS = [
  "Login to the assigned Roblox bot account manually.",
  "Open the mailbox system in the correct game.",
  "Send the listed item to the customer Roblox username.",
  "After mailbox send succeeds, click Mark Delivered.",
];

const MARK_DELIVERABLE_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.QUEUED,
  DeliveryStatus.PROCESSING,
  DeliveryStatus.WAITING_USER,
  DeliveryStatus.RETRYING,
];

const deliveryJobInclude = {
  logs: { orderBy: { createdAt: "desc" as const }, take: 100 },
  withdrawal: {
    include: {
      items: { include: { product: true } },
      botAssignments: {
        include: { botAccount: true },
        orderBy: { assignedAt: "desc" as const },
        take: 1,
      },
    },
  },
  claim: {
    include: {
      items: { include: { product: true } },
      botAssignments: {
        include: { botAccount: true },
        orderBy: { assignedAt: "desc" as const },
        take: 1,
      },
    },
  },
} satisfies Prisma.DeliveryJobInclude;

type LoadedDeliveryJob = Prisma.DeliveryJobGetPayload<{
  include: typeof deliveryJobInclude;
}>;

export type DeliveryItemRow = {
  productId: string;
  name: string;
  quantity: number;
  game: GameType;
  rarity: string | null;
};

function getWithdrawalFromJob(job: LoadedDeliveryJob) {
  if (!job.withdrawal) {
    return null;
  }
  return job.withdrawal;
}

function getAssignmentFromJob(job: LoadedDeliveryJob) {
  const withdrawal = job.withdrawal;
  if (withdrawal?.botAssignments[0]) {
    return withdrawal.botAssignments[0];
  }
  return job.claim?.botAssignments[0] ?? null;
}

function getItemsFromJob(job: LoadedDeliveryJob): DeliveryItemRow[] {
  const items = job.withdrawal?.items ?? job.claim?.items ?? [];
  return items.map((item) => ({
    productId: item.productId,
    name: item.product.name,
    quantity: item.quantity,
    game: item.product.game,
    rarity: item.product.rarity,
  }));
}

export function getOperatorInstructions(method: DeliveryMethod | string | undefined) {
  return method === DeliveryMethod.MAILBOX || method === "MAILBOX"
    ? MAILBOX_OPERATOR_INSTRUCTIONS
    : TRADING_OPERATOR_INSTRUCTIONS;
}

export function formatDeliveryJobListRow(job: LoadedDeliveryJob) {
  const withdrawal = job.withdrawal;
  const assignment = getAssignmentFromJob(job);
  const items = getItemsFromJob(job);
  const game = items[0]?.game ?? null;

  return {
    id: job.id,
    withdrawalCode: withdrawal?.withdrawalCode ?? null,
    claimCode: job.claim?.claimCode ?? null,
    customerRobloxUsername:
      withdrawal?.robloxUsername ?? job.claim?.robloxUsername ?? null,
    game,
    deliveryMethod: null as string | null,
    assignedBotUsername: assignment?.botAccount.robloxUsername ?? null,
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
    })),
    status: job.status,
    attempts: job.attempts,
    createdAt: job.createdAt,
  };
}

export async function formatDeliveryJobDetail(job: LoadedDeliveryJob) {
  const withdrawal = getWithdrawalFromJob(job);
  const assignment = getAssignmentFromJob(job);
  const items = getItemsFromJob(job);
  const game = items[0]?.game ?? null;
  const gameConfig = game ? await getGameDeliveryConfig(game) : null;

  return {
    id: job.id,
    status: job.status,
    attempts: job.attempts,
    lastError: job.lastError,
    deliveredAt: job.deliveredAt,
    createdAt: job.createdAt,
    withdrawal: withdrawal
      ? {
          id: withdrawal.id,
          withdrawalCode: withdrawal.withdrawalCode,
          status: withdrawal.status,
          robloxUsername: withdrawal.robloxUsername,
        }
      : null,
    claim: job.claim
      ? {
          id: job.claim.id,
          claimCode: job.claim.claimCode,
          status: job.claim.status,
          robloxUsername: job.claim.robloxUsername,
        }
      : null,
    game,
    deliveryMethod: gameConfig?.deliveryMethod ?? null,
    gameConfig: gameConfig
      ? {
          deliveryMethod: gameConfig.deliveryMethod,
          requiresFriend: gameConfig.requiresFriend,
          requiresPrivateServer: gameConfig.requiresPrivateServer,
          requiresCustomerJoin: gameConfig.requiresCustomerJoin,
          instructions: gameConfig.instructions,
        }
      : null,
    assignment: assignment
      ? {
          id: assignment.id,
          status: assignment.status,
          bot: {
            id: assignment.botAccount.id,
            robloxUsername: assignment.botAccount.robloxUsername,
            profileUrl: assignment.botAccount.profileUrl,
            privateServerUrl: assignment.botAccount.privateServerUrl,
          },
        }
      : null,
    items,
    operatorInstructions: getOperatorInstructions(gameConfig?.deliveryMethod),
    logs: job.logs.map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      createdAt: log.createdAt,
    })),
  };
}

async function loadDeliveryJob(deliveryJobId: string) {
  return prisma.deliveryJob.findUnique({
    where: { id: deliveryJobId },
    include: deliveryJobInclude,
  });
}

export async function listDeliveryJobs(limit = 100) {
  const jobs = await prisma.deliveryJob.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: deliveryJobInclude,
  });

  const rows = await Promise.all(
    jobs.map(async (job) => {
      const row = formatDeliveryJobListRow(job);
      const game = row.game;
      if (game) {
        const config = await getGameDeliveryConfig(game);
        row.deliveryMethod = config?.deliveryMethod ?? null;
      }
      return row;
    })
  );

  return rows;
}

export async function getDeliveryJobDetail(deliveryJobId: string) {
  const job = await loadDeliveryJob(deliveryJobId);
  if (!job) return null;
  return formatDeliveryJobDetail(job);
}

export function verifyReservedInventory(
  botInventories: Array<{
    productId: string;
    quantity: number;
    reservedQuantity: number;
  }>,
  items: Array<{ productId: string; quantity: number }>
) {
  for (const item of items) {
    const inventory = botInventories.find(
      (entry) => entry.productId === item.productId
    );
    if (!inventory) {
      return { ok: false as const, error: `Missing bot inventory for product ${item.productId}` };
    }
    if (inventory.reservedQuantity < item.quantity) {
      return {
        ok: false as const,
        error: `Insufficient reserved quantity for ${item.productId}`,
      };
    }
    if (inventory.quantity < item.quantity) {
      return {
        ok: false as const,
        error: `Insufficient bot quantity for ${item.productId}`,
      };
    }
  }
  return { ok: true as const };
}

export function computeInventoryDeduction(
  quantity: number,
  reservedQuantity: number,
  deliverQuantity: number
) {
  const nextQuantity = quantity - deliverQuantity;
  const nextReserved = Math.max(0, reservedQuantity - deliverQuantity);
  return { nextQuantity, nextReserved };
}

export async function markDeliveryJobDelivered(deliveryJobId: string) {
  const job = await loadDeliveryJob(deliveryJobId);
  if (!job) {
    return { error: "Delivery job not found" as const };
  }

  const withdrawal = getWithdrawalFromJob(job);
  if (!withdrawal) {
    return { error: "Withdrawal delivery job required" as const };
  }

  if (job.status === DeliveryStatus.DELIVERED) {
    return formatDeliveryJobDetail(job);
  }

  if (withdrawal.status === WithdrawalStatus.DELIVERED) {
    return formatDeliveryJobDetail(job);
  }

  if (!MARK_DELIVERABLE_STATUSES.includes(job.status)) {
    return { error: "Delivery job cannot be marked delivered in current status" as const };
  }

  const assignment = getAssignmentFromJob(job);
  if (!assignment) {
    return { error: "Bot assignment not found" as const };
  }

  const items = withdrawal.items;
  const botAccountId = assignment.botAccountId;

  const inventories = await prisma.botInventory.findMany({
    where: {
      botAccountId,
      productId: { in: items.map((item) => item.productId) },
    },
  });

  const inventoryCheck = verifyReservedInventory(
    inventories.map((entry) => ({
      productId: entry.productId,
      quantity: entry.quantity,
      reservedQuantity: entry.reservedQuantity,
    })),
    items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))
  );

  if (!inventoryCheck.ok) {
    return { error: inventoryCheck.error };
  }

  await prisma.$transaction(async (tx) => {
    const currentJob = await tx.deliveryJob.findUnique({
      where: { id: deliveryJobId },
    });

    if (!currentJob) throw new Error("DELIVERY_JOB_NOT_FOUND");
    if (currentJob.status === DeliveryStatus.DELIVERED) return;

    for (const item of items) {
      const inventory = await tx.botInventory.findUnique({
        where: {
          botAccountId_productId: {
            botAccountId,
            productId: item.productId,
          },
        },
      });

      if (!inventory) throw new Error("INSUFFICIENT_INVENTORY");
      if (
        inventory.reservedQuantity < item.quantity ||
        inventory.quantity < item.quantity
      ) {
        throw new Error("INSUFFICIENT_INVENTORY");
      }

      const { nextQuantity, nextReserved } = computeInventoryDeduction(
        inventory.quantity,
        inventory.reservedQuantity,
        item.quantity
      );

      if (nextQuantity < 0) throw new Error("INSUFFICIENT_INVENTORY");

      await tx.botInventory.update({
        where: { id: inventory.id },
        data: {
          quantity: nextQuantity,
          reservedQuantity: nextReserved,
        },
      });

      await tx.inventoryLog.create({
        data: {
          botInventoryId: inventory.id,
          botAccountId,
          productId: item.productId,
          delta: -item.quantity,
          quantityBefore: inventory.quantity,
          quantityAfter: nextQuantity,
          reason: "admin_mark_delivered",
          metadata: {
            deliveryJobId,
            withdrawalId: withdrawal.id,
          },
        },
      });
    }

    await tx.deliveryJob.update({
      where: { id: deliveryJobId },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        lastError: null,
        lockedAt: null,
      },
    });

    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: WithdrawalStatus.DELIVERED },
    });

    await tx.botAssignment.update({
      where: { id: assignment.id },
      data: {
        status: BotAssignmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await tx.deliveryLog.create({
      data: {
        deliveryJobId,
        withdrawalId: withdrawal.id,
        message: "Admin marked delivery completed.",
      },
    });

    const bot = await tx.botAccount.findUnique({ where: { id: botAccountId } });
    if (bot && bot.currentDeliveries > 0) {
      await tx.botAccount.update({
        where: { id: botAccountId },
        data: { currentDeliveries: bot.currentDeliveries - 1 },
      });
    }
  });

  await syncBotCurrentDeliveries(botAccountId);

  const updated = await loadDeliveryJob(deliveryJobId);
  if (!updated) {
    return { error: "Delivery job not found" as const };
  }

  return formatDeliveryJobDetail(updated);
}

export async function markDeliveryJobFailed(
  deliveryJobId: string,
  reason: string
) {
  const job = await loadDeliveryJob(deliveryJobId);
  if (!job) {
    return { error: "Delivery job not found" as const };
  }

  const withdrawal = getWithdrawalFromJob(job);
  if (!withdrawal) {
    return { error: "Withdrawal delivery job required" as const };
  }

  if (
    job.status === DeliveryStatus.DELIVERED ||
    withdrawal.status === WithdrawalStatus.DELIVERED
  ) {
    return { error: "Cannot mark failed after delivery is completed" as const };
  }

  if (job.status === DeliveryStatus.FAILED) {
    return formatDeliveryJobDetail(job);
  }

  const assignment = getAssignmentFromJob(job);
  if (!assignment) {
    return { error: "Bot assignment not found" as const };
  }

  const items = withdrawal.items;
  const botAccountId = assignment.botAccountId;

  await prisma.$transaction(async (tx) => {
    const currentJob = await tx.deliveryJob.findUnique({
      where: { id: deliveryJobId },
    });
    if (!currentJob) throw new Error("DELIVERY_JOB_NOT_FOUND");
    if (currentJob.status === DeliveryStatus.DELIVERED) {
      throw new Error("ALREADY_DELIVERED");
    }
    if (currentJob.status === DeliveryStatus.FAILED) return;

    for (const item of items) {
      const inventory = await tx.botInventory.findUnique({
        where: {
          botAccountId_productId: {
            botAccountId,
            productId: item.productId,
          },
        },
      });

      if (!inventory) continue;

      await tx.botInventory.update({
        where: { id: inventory.id },
        data: {
          reservedQuantity: Math.max(
            0,
            inventory.reservedQuantity - item.quantity
          ),
        },
      });
    }

    await tx.deliveryJob.update({
      where: { id: deliveryJobId },
      data: {
        status: DeliveryStatus.FAILED,
        lastError: reason,
        lockedAt: null,
      },
    });

    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: WithdrawalStatus.FAILED },
    });

    await tx.botAssignment.update({
      where: { id: assignment.id },
      data: {
        status: BotAssignmentStatus.FAILED,
        completedAt: new Date(),
        failureReason: reason,
      },
    });

    await tx.deliveryLog.create({
      data: {
        deliveryJobId,
        withdrawalId: withdrawal.id,
        level: "WARN",
        message: `Delivery marked failed: ${reason}`,
      },
    });

    const bot = await tx.botAccount.findUnique({ where: { id: botAccountId } });
    if (bot && bot.currentDeliveries > 0) {
      await tx.botAccount.update({
        where: { id: botAccountId },
        data: { currentDeliveries: bot.currentDeliveries - 1 },
      });
    }
  });

  await syncBotCurrentDeliveries(botAccountId);

  const updated = await loadDeliveryJob(deliveryJobId);
  if (!updated) {
    return { error: "Delivery job not found" as const };
  }

  return formatDeliveryJobDetail(updated);
}

export function resolveRetryAssignmentStatus(input: {
  requiresFriend: boolean;
  requiresCustomerJoin: boolean;
}) {
  if (input.requiresFriend && input.requiresCustomerJoin) {
    return BotAssignmentStatus.READY_TO_JOIN;
  }
  return BotAssignmentStatus.ASSIGNED;
}

export async function retryFailedDeliveryJob(deliveryJobId: string) {
  const job = await loadDeliveryJob(deliveryJobId);
  if (!job) {
    return { error: "Delivery job not found" as const };
  }

  const withdrawal = getWithdrawalFromJob(job);
  if (!withdrawal) {
    return { error: "Withdrawal delivery job required" as const };
  }

  if (job.status !== DeliveryStatus.FAILED) {
    return { error: "Only failed deliveries can be retried" as const };
  }

  const assignment = getAssignmentFromJob(job);
  if (!assignment) {
    return { error: "Bot assignment not found" as const };
  }

  const items = withdrawal.items;
  const botAccountId = assignment.botAccountId;
  const game = items[0]?.product.game;
  const gameConfig = game ? await getGameDeliveryConfig(game) : null;

  const inventories = await prisma.botInventory.findMany({
    where: {
      botAccountId,
      productId: { in: items.map((item) => item.productId) },
    },
  });

  for (const item of items) {
    const inventory = inventories.find((entry) => entry.productId === item.productId);
    if (!inventory) {
      return { error: `Missing bot inventory for ${item.product.name}` };
    }
    const available = inventory.quantity - inventory.reservedQuantity;
    if (available < item.quantity) {
      return {
        error: `Not enough available bot inventory for ${item.product.name}`,
      };
    }
  }

  const nextAssignmentStatus = resolveRetryAssignmentStatus({
    requiresFriend: gameConfig?.requiresFriend ?? true,
    requiresCustomerJoin: gameConfig?.requiresCustomerJoin ?? true,
  });

  await prisma.$transaction(async (tx) => {
    const currentJob = await tx.deliveryJob.findUnique({
      where: { id: deliveryJobId },
    });
    if (!currentJob) throw new Error("DELIVERY_JOB_NOT_FOUND");
    if (currentJob.status !== DeliveryStatus.FAILED) {
      throw new Error("NOT_FAILED");
    }

    for (const item of items) {
      const inventory = await tx.botInventory.findUnique({
        where: {
          botAccountId_productId: {
            botAccountId,
            productId: item.productId,
          },
        },
      });

      if (!inventory) throw new Error("INSUFFICIENT_INVENTORY");

      const available = inventory.quantity - inventory.reservedQuantity;
      if (available < item.quantity) throw new Error("INSUFFICIENT_INVENTORY");

      await tx.botInventory.update({
        where: { id: inventory.id },
        data: { reservedQuantity: { increment: item.quantity } },
      });
    }

    await tx.deliveryJob.update({
      where: { id: deliveryJobId },
      data: {
        status: DeliveryStatus.QUEUED,
        lastError: null,
        lockedAt: null,
      },
    });

    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: WithdrawalStatus.QUEUED },
    });

    await tx.botAssignment.update({
      where: { id: assignment.id },
      data: {
        status: nextAssignmentStatus,
        completedAt: null,
        failureReason: null,
      },
    });

    await tx.deliveryLog.create({
      data: {
        deliveryJobId,
        withdrawalId: withdrawal.id,
        message: "Delivery retry was queued by admin.",
      },
    });

    await tx.botAccount.update({
      where: { id: botAccountId },
      data: { currentDeliveries: { increment: 1 } },
    });
  });

  await syncBotCurrentDeliveries(botAccountId);

  const updated = await loadDeliveryJob(deliveryJobId);
  if (!updated) {
    return { error: "Delivery job not found" as const };
  }

  return formatDeliveryJobDetail(updated);
}
