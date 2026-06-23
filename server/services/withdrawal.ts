import {
  BotAssignmentStatus,
  CustomerInventoryLogReason,
  DeliveryStatus,
  GameType,
  WithdrawalStatus,
  Prisma,
} from "@prisma/client";
import { formatMM2Session } from "@/server/services/mm2-delivery";
import { getWithdrawalQueueInfo } from "@/server/services/queue-estimate";
import { prisma } from "@/lib/prisma";
import {
  FRAUD_REVIEW_THRESHOLD,
  generateWithdrawalCode,
} from "@/lib/utils";
import { getWithdrawalStatusMessage } from "@/lib/withdrawal-status";
import {
  assignBotAndCreateDeliveryJob,
  formatAssignmentPayload,
} from "@/server/services/delivery-request";
import {
  buildWithdrawalDeliveryPayload,
  enqueueDeliveryJobOnce,
} from "@/server/services/delivery-queue";
import { reserveCustomerInventoryItems } from "@/server/services/customer-inventory";
import { getGameDeliveryConfig } from "@/server/services/game-delivery-config";
import {
  cancelDeliveryJob,
  findBlockingBotDelivery,
  releaseBotAssignmentCapacity,
} from "@/server/services/bot-capacity";

export const SUPPORT_REQUIRED_MESSAGE =
  "This withdrawal requires customer service review for fraud protection. Please contact support.";

const TERMINAL_WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  WithdrawalStatus.DELIVERED,
  WithdrawalStatus.FAILED,
  WithdrawalStatus.CANCELLED,
  WithdrawalStatus.EXPIRED,
  WithdrawalStatus.SUPPORT_REQUIRED,
];

const withdrawalInclude = {
  items: { include: { product: true } },
  deliveryJob: {
    include: {
      logs: { orderBy: { createdAt: "desc" as const }, take: 50 },
    },
  },
  botAssignments: {
    include: { botAccount: true },
    orderBy: { assignedAt: "desc" as const },
    take: 1,
  },
  mm2Session: true,
} satisfies Prisma.WithdrawalInclude;

type LoadedWithdrawal = Prisma.WithdrawalGetPayload<{
  include: typeof withdrawalInclude;
}>;

function getPrimaryProductName(withdrawal: LoadedWithdrawal): string {
  const first = withdrawal.items[0];
  if (!first) return "items";
  if (withdrawal.items.length === 1) return first.product.name;
  return `${first.product.name} +${withdrawal.items.length - 1} more`;
}

async function queueWithdrawalDelivery(withdrawal: LoadedWithdrawal) {
  if (!withdrawal.deliveryJob) {
    throw new Error("Delivery job not found");
  }

  await enqueueDeliveryJobOnce(
    buildWithdrawalDeliveryPayload({
      deliveryJobId: withdrawal.deliveryJob.id,
      withdrawalId: withdrawal.id,
      withdrawalCode: withdrawal.withdrawalCode,
      productName: getPrimaryProductName(withdrawal),
    })
  );
}

async function generateUniqueWithdrawalCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const withdrawalCode = generateWithdrawalCode();
    const existing = await prisma.withdrawal.findUnique({
      where: { withdrawalCode },
      select: { id: true },
    });
    if (!existing) return withdrawalCode;
  }
  throw new Error("Failed to generate unique withdrawal code");
}

function calculateTotalValue(
  items: Array<{ quantity: number; unitValue: number | null }>
): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * (item.unitValue ?? 0),
    0
  );
}

async function loadWithdrawal(withdrawalCode: string) {
  return prisma.withdrawal.findUnique({
    where: { withdrawalCode },
    include: withdrawalInclude,
  });
}

async function loadWithdrawalById(withdrawalId: string) {
  return prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: withdrawalInclude,
  });
}

export function formatWithdrawalResponse(
  withdrawal: LoadedWithdrawal,
  gameConfig?: {
    game: GameType;
    deliveryMethod: string;
    requiresFriend: boolean;
    requiresPrivateServer: boolean;
    requiresCustomerJoin: boolean;
    requiresManualConfirmation: boolean;
    instructions: string | null;
    averageDeliveryMinutes?: number;
  } | null,
  queueInfo?: { queuePosition: number; estimatedWaitMinutes: number }
) {
  const game = withdrawal.items[0]?.product.game ?? null;
  const assignment = withdrawal.botAssignments[0];

  return {
    withdrawal: {
      id: withdrawal.id,
      withdrawalCode: withdrawal.withdrawalCode,
      status: withdrawal.status,
      robloxUsername: withdrawal.robloxUsername,
      totalValue: Number(withdrawal.totalValue),
      supportReason: withdrawal.supportReason,
      createdAt: withdrawal.createdAt,
    },
    game,
    gameConfig: gameConfig
      ? {
          game: gameConfig.game,
          deliveryMethod: gameConfig.deliveryMethod,
          requiresFriend: gameConfig.requiresFriend,
          requiresPrivateServer: gameConfig.requiresPrivateServer,
          requiresCustomerJoin: gameConfig.requiresCustomerJoin,
          requiresManualConfirmation: gameConfig.requiresManualConfirmation,
          instructions: gameConfig.instructions,
        }
      : null,
    items: withdrawal.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      game: item.product.game,
      quantity: item.quantity,
      unitValue: item.unitValue ? Number(item.unitValue) : 0,
      rarity: item.product.rarity,
    })),
    assignment: assignment
      ? formatAssignmentPayload(
          assignment,
          withdrawal.items.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            quantity: item.quantity,
          }))
        )
      : null,
    deliveryJob: withdrawal.deliveryJob
      ? {
          id: withdrawal.deliveryJob.id,
          status: withdrawal.deliveryJob.status,
        }
      : null,
    logs: (withdrawal.deliveryJob?.logs ?? []).map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      createdAt: log.createdAt,
    })),
    statusMessage: getWithdrawalStatusMessage(withdrawal.status),
    supportMessage:
      withdrawal.status === WithdrawalStatus.SUPPORT_REQUIRED
        ? SUPPORT_REQUIRED_MESSAGE
        : null,
    queuePosition: queueInfo?.queuePosition ?? null,
    estimatedWaitMinutes: queueInfo?.estimatedWaitMinutes ?? null,
    mm2Session: withdrawal.mm2Session
      ? formatMM2Session(withdrawal.mm2Session)
      : null,
  };
}


export async function createWithdrawal(input: {
  sessionId?: string;
  testCode?: string;
  customerId?: string;
  items: Array<{ inventoryId: string; quantity: number }>;
}) {
  const inventories = await prisma.customerInventory.findMany({
    where: { id: { in: input.items.map((item) => item.inventoryId) } },
    include: { product: true, customer: true },
  });

  if (inventories.length !== input.items.length) {
    throw new Error("One or more inventory items were not found");
  }

  const inventoryById = new Map(inventories.map((entry) => [entry.id, entry]));
  const withdrawalItems = input.items.map((item) => {
    const inventory = inventoryById.get(item.inventoryId)!;
    return {
      inventory,
      quantity: item.quantity,
      unitValue: inventory.product.value
        ? Number(inventory.product.value)
        : 0,
    };
  });

  const games = Array.from(
    new Set(withdrawalItems.map((item) => item.inventory.product.game))
  );

  if (games.length !== 1) {
    throw new Error("All withdrawn items must belong to the same game");
  }

  const totalValue = calculateTotalValue(
    withdrawalItems.map((item) => ({
      quantity: item.quantity,
      unitValue: item.unitValue,
    }))
  );

  const firstInventory = inventories[0]!;
  const customerId =
    input.customerId ?? firstInventory.customerId ?? undefined;
  const sessionId =
    input.sessionId ?? (customerId ? undefined : firstInventory.sessionId ?? undefined);

  const withdrawalCode = await generateUniqueWithdrawalCode();
  const requiresSupport = totalValue > FRAUD_REVIEW_THRESHOLD;

  const withdrawal = await prisma.$transaction(async (tx) => {
    await reserveCustomerInventoryItems(tx, input.items);

    return tx.withdrawal.create({
      data: {
        withdrawalCode,
        customerId,
        sessionId,
        totalValue,
        status: requiresSupport
          ? WithdrawalStatus.SUPPORT_REQUIRED
          : WithdrawalStatus.USERNAME_REQUIRED,
        supportReason: requiresSupport
          ? "Withdrawal total exceeds fraud review threshold"
          : null,
        items: {
          create: withdrawalItems.map((item) => ({
            productId: item.inventory.productId,
            quantity: item.quantity,
            unitValue: item.unitValue,
          })),
        },
      },
      include: withdrawalInclude,
    });
  });

  const gameConfig = await getGameDeliveryConfig(games[0]!);
  return formatWithdrawalResponse(withdrawal, gameConfig);
}

export async function getWithdrawalByCode(withdrawalCode: string) {
  const withdrawal = await loadWithdrawal(withdrawalCode);
  if (!withdrawal) return null;

  const game = withdrawal.items[0]?.product.game;
  const gameConfig = game ? await getGameDeliveryConfig(game) : null;
  const queueInfo = game ? await getWithdrawalQueueInfo(withdrawal.id, game) : undefined;

  return formatWithdrawalResponse(withdrawal, gameConfig, queueInfo);
}

export async function linkWithdrawalUsername(
  withdrawalCode: string,
  robloxUsername: string
) {
  const withdrawal = await loadWithdrawal(withdrawalCode);

  if (!withdrawal) {
    return { error: "Withdrawal not found" as const };
  }

  if (withdrawal.status === WithdrawalStatus.SUPPORT_REQUIRED) {
    return { error: "Withdrawal requires support review" as const };
  }

  if (
    withdrawal.status === WithdrawalStatus.DELIVERED ||
    withdrawal.status === WithdrawalStatus.CANCELLED ||
    withdrawal.status === WithdrawalStatus.FAILED ||
    withdrawal.status === WithdrawalStatus.EXPIRED
  ) {
    return { error: `Withdrawal is ${withdrawal.status.toLowerCase()}` as const };
  }

  const updated = await prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: {
      robloxUsername: robloxUsername.trim(),
      // PENDING = username saved, waiting for bot assignment (not yet in delivery queue)
      status: WithdrawalStatus.PENDING,
    },
    include: withdrawalInclude,
  });

  const game = updated.items[0]?.product.game;
  const gameConfig = game ? await getGameDeliveryConfig(game) : null;

  // Auto-assign bot immediately after username confirmation
  const started = await startWithdrawal(updated.id);
  if (!("error" in started)) {
    return started;
  }

  // Bot unavailable — return saved username so customer can retry Start Delivery
  return {
    ...formatWithdrawalResponse(updated, gameConfig),
    startError: started.error,
    startHint: "hint" in started ? started.hint : undefined,
    startShortages: "shortages" in started ? started.shortages : undefined,
  };
}

export async function startWithdrawal(withdrawalId: string) {
  const withdrawal = await loadWithdrawalById(withdrawalId);

  if (!withdrawal) {
    return { error: "Withdrawal not found" as const };
  }

  if (withdrawal.status === WithdrawalStatus.SUPPORT_REQUIRED) {
    return { error: "Withdrawal requires support review" as const };
  }

  if (withdrawal.status === WithdrawalStatus.DELIVERED) {
    return { error: "Withdrawal already delivered" as const };
  }

  if (withdrawal.status === WithdrawalStatus.CANCELLED) {
    return { error: "Withdrawal cancelled" as const };
  }

  if (withdrawal.status === WithdrawalStatus.EXPIRED) {
    return { error: "Withdrawal has expired" as const };
  }

  if (withdrawal.deliveryJob && withdrawal.botAssignments[0]) {
    const game = withdrawal.items[0]?.product.game;
    const gameConfig = game ? await getGameDeliveryConfig(game) : null;
    return formatWithdrawalResponse(withdrawal, gameConfig);
  }

  const startable: WithdrawalStatus[] = [
    WithdrawalStatus.QUEUED,
    WithdrawalStatus.USERNAME_REQUIRED,
    WithdrawalStatus.PENDING,
  ];

  if (!startable.includes(withdrawal.status)) {
    if (withdrawal.botAssignments[0]) {
      const game = withdrawal.items[0]?.product.game;
      const gameConfig = game ? await getGameDeliveryConfig(game) : null;
      return formatWithdrawalResponse(withdrawal, gameConfig);
    }
    return { error: "Invalid withdrawal status" as const };
  }

  if (!withdrawal.robloxUsername) {
    return { error: "Roblox username is required" as const };
  }

  if (withdrawal.items.length === 0) {
    return { error: "Invalid withdrawal status" as const };
  }

  const game = withdrawal.items[0]!.product.game;
  const deliveryItems = withdrawal.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    name: item.product.name,
  }));

  const result = await assignBotAndCreateDeliveryJob(
    { type: "withdrawal", withdrawalId: withdrawal.id },
    game,
    deliveryItems
  );

  if (!result.success) {
    if (result.error === "No bot available") {
      const blocking = await findBlockingBotDelivery(game);
      const blockingCode =
        blocking?.withdrawalCode ?? blocking?.claimCode ?? null;
      const hint = blockingCode
        ? `The delivery bot is currently assigned to ${blocking?.withdrawalCode ? "withdrawal" : "claim"} ${blockingCode}. Complete or cancel it in Admin first.`
        : "All delivery bots are currently busy. Please try again shortly.";

      return {
        error: result.error,
        shortages: result.shortages,
        hint,
        blockingCode,
        blockingBot: blocking?.botUsername ?? null,
      };
    }

    return {
      error: result.error,
      shortages: result.shortages,
    };
  }

  const gameConfig = await getGameDeliveryConfig(game);

  const isMailboxFlow =
    gameConfig?.deliveryMethod === "MAILBOX" ||
    (gameConfig != null &&
      !gameConfig.requiresFriend &&
      !gameConfig.requiresCustomerJoin);

  const nextStatus = isMailboxFlow
    ? WithdrawalStatus.QUEUED
    : WithdrawalStatus.WAITING_FRIEND_REQUEST;

  const updated = await prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: { status: nextStatus },
    include: withdrawalInclude,
  });

  if (isMailboxFlow && updated.deliveryJob) {
    await prisma.$transaction(async (tx) => {
      await tx.deliveryJob.update({
        where: { id: updated.deliveryJob!.id },
        data: { status: DeliveryStatus.QUEUED },
      });

      await tx.deliveryLog.create({
        data: {
          deliveryJobId: updated.deliveryJob!.id,
          withdrawalId: updated.id,
          message: "Mailbox delivery queued for bot processing.",
        },
      });
    });

    const reloaded = await loadWithdrawalById(withdrawal.id);
    if (!reloaded) {
      return { error: "Withdrawal not found" as const };
    }

    await queueWithdrawalDelivery(reloaded);
    return formatWithdrawalResponse(reloaded, gameConfig);
  }

  // Reload so MM2 session (created after assignment) is included in the response
  const reloaded = await loadWithdrawalById(withdrawal.id);
  if (!reloaded) {
    return { error: "Withdrawal not found" as const };
  }

  return formatWithdrawalResponse(reloaded, gameConfig);
}

export async function getWithdrawalById(withdrawalId: string) {
  const withdrawal = await loadWithdrawalById(withdrawalId);
  if (!withdrawal) return null;

  const game = withdrawal.items[0]?.product.game;
  const gameConfig = game ? await getGameDeliveryConfig(game) : null;

  return formatWithdrawalResponse(withdrawal, gameConfig);
}

function verifyWithdrawalActionAllowed(withdrawal: LoadedWithdrawal) {
  if (TERMINAL_WITHDRAWAL_STATUSES.includes(withdrawal.status)) {
    return {
      error: `Withdrawal is ${withdrawal.status.toLowerCase().replace(/_/g, " ")}` as const,
    };
  }
  return null;
}

function verifyBotAssignmentOwnership(
  withdrawal: LoadedWithdrawal,
  botAssignmentId: string
) {
  const assignment = withdrawal.botAssignments[0];
  if (!assignment || assignment.id !== botAssignmentId) {
    return { error: "Bot assignment not found" as const };
  }
  return { assignment };
}

export async function markWithdrawalFriendRequestSent(
  withdrawalId: string,
  botAssignmentId: string
) {
  const withdrawal = await loadWithdrawalById(withdrawalId);
  if (!withdrawal) {
    return { error: "Withdrawal not found" as const };
  }

  const blocked = verifyWithdrawalActionAllowed(withdrawal);
  if (blocked) return blocked;

  const ownership = verifyBotAssignmentOwnership(withdrawal, botAssignmentId);
  if ("error" in ownership) return ownership;

  const { assignment } = ownership;

  if (
    assignment.status === BotAssignmentStatus.FRIEND_REQUEST_SENT ||
    assignment.status === BotAssignmentStatus.READY_TO_JOIN ||
    assignment.status === BotAssignmentStatus.IN_GAME ||
    assignment.status === BotAssignmentStatus.DELIVERING ||
    assignment.status === BotAssignmentStatus.COMPLETED
  ) {
    const game = withdrawal.items[0]?.product.game;
    const gameConfig = game ? await getGameDeliveryConfig(game) : null;
    return formatWithdrawalResponse(withdrawal, gameConfig);
  }

  if (assignment.status !== BotAssignmentStatus.FRIEND_REQUEST_PENDING) {
    return { error: "Invalid bot assignment status" as const };
  }

  if (!withdrawal.deliveryJob) {
    return { error: "Delivery job not found" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.botAssignment.update({
      where: { id: assignment.id },
      data: { status: BotAssignmentStatus.FRIEND_REQUEST_SENT },
    });

    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: WithdrawalStatus.WAITING_JOIN },
    });

    await tx.deliveryLog.create({
      data: {
        deliveryJobId: withdrawal.deliveryJob!.id,
        withdrawalId: withdrawal.id,
        message: "Customer marked friend request as sent.",
      },
    });
  });

  const updated = await loadWithdrawalById(withdrawalId);
  if (!updated) {
    return { error: "Withdrawal not found" as const };
  }

  const game = updated.items[0]?.product.game;
  const gameConfig = game ? await getGameDeliveryConfig(game) : null;
  return formatWithdrawalResponse(updated, gameConfig);
}

export async function joinWithdrawalGame(
  withdrawalId: string,
  botAssignmentId: string
) {
  const withdrawal = await loadWithdrawalById(withdrawalId);
  if (!withdrawal) {
    return { error: "Withdrawal not found" as const };
  }

  const blocked = verifyWithdrawalActionAllowed(withdrawal);
  if (blocked) return blocked;

  const ownership = verifyBotAssignmentOwnership(withdrawal, botAssignmentId);
  if ("error" in ownership) return ownership;

  const { assignment } = ownership;
  const game = withdrawal.items[0]?.product.game;
  const gameConfig = game ? await getGameDeliveryConfig(game) : null;
  const privateServerUrl = assignment.botAccount.privateServerUrl;

  if (
    assignment.status === BotAssignmentStatus.IN_GAME ||
    assignment.status === BotAssignmentStatus.DELIVERING ||
    assignment.status === BotAssignmentStatus.COMPLETED
  ) {
    return {
      ...formatWithdrawalResponse(withdrawal, gameConfig),
      privateServerUrl,
    };
  }

  if (gameConfig?.requiresCustomerJoin && !privateServerUrl) {
    return { error: "Bot private server URL is not configured" as const };
  }

  if (
    assignment.status !== BotAssignmentStatus.FRIEND_REQUEST_SENT &&
    assignment.status !== BotAssignmentStatus.READY_TO_JOIN
  ) {
    return { error: "Friend request must be sent before joining" as const };
  }

  if (!withdrawal.deliveryJob) {
    return { error: "Delivery job not found" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.botAssignment.update({
      where: { id: assignment.id },
      data: { status: BotAssignmentStatus.IN_GAME },
    });

    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: WithdrawalStatus.QUEUED },
    });

    await tx.deliveryJob.update({
      where: { id: withdrawal.deliveryJob!.id },
      data: { status: DeliveryStatus.QUEUED },
    });

    await tx.deliveryLog.create({
      data: {
        deliveryJobId: withdrawal.deliveryJob!.id,
        withdrawalId: withdrawal.id,
        message: "Customer clicked Join Game and delivery was queued.",
      },
    });
  });

  const updated = await loadWithdrawalById(withdrawalId);
  if (!updated) {
    return { error: "Withdrawal not found" as const };
  }

  await queueWithdrawalDelivery(updated);

  const refreshedGameConfig = game
    ? await getGameDeliveryConfig(game)
    : null;

  return {
    ...formatWithdrawalResponse(updated, refreshedGameConfig),
    privateServerUrl: updated.botAssignments[0]?.botAccount.privateServerUrl ?? null,
  };
}

export async function listWithdrawals(limit = 100) {
  return prisma.withdrawal.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });
}

export async function approveWithdrawalSupport(withdrawalId: string) {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) return null;
  if (withdrawal.status !== WithdrawalStatus.SUPPORT_REQUIRED) {
    throw new Error("Withdrawal is not awaiting support review");
  }

  return prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: WithdrawalStatus.USERNAME_REQUIRED,
      supportReason: null,
    },
    include: {
      items: { include: { product: true } },
      deliveryJob: true,
      botAssignments: { include: { botAccount: true }, take: 1 },
    },
  });
}

export async function cancelWithdrawal(withdrawalId: string) {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: {
      items: true,
      deliveryJob: true,
      botAssignments: {
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!withdrawal) return null;

  if (withdrawal.status === WithdrawalStatus.DELIVERED) {
    throw new Error("Cannot cancel a completed withdrawal");
  }

  if (withdrawal.status === WithdrawalStatus.CANCELLED) {
    return withdrawal;
  }

  const assignment = withdrawal.botAssignments[0];

  return prisma.$transaction(async (tx) => {
    for (const item of withdrawal.items) {
      const inventory = await tx.customerInventory.findFirst({
        where: {
          productId: item.productId,
          OR: [
            withdrawal.customerId
              ? { customerId: withdrawal.customerId }
              : undefined,
            withdrawal.sessionId
              ? { sessionId: withdrawal.sessionId }
              : undefined,
          ].filter(Boolean) as Prisma.CustomerInventoryWhereInput[],
        },
      });

      if (inventory) {
        await tx.customerInventory.update({
          where: { id: inventory.id },
          data: {
            reservedQuantity: { decrement: item.quantity },
          },
        });

        await tx.customerInventoryLog.create({
          data: {
            customerId: withdrawal.customerId ?? null,
            sessionId: withdrawal.customerId ? null : (withdrawal.sessionId ?? null),
            productId: item.productId,
            delta: item.quantity,
            reason: CustomerInventoryLogReason.WITHDRAW_CANCELLED,
          },
        });
      }
    }

    if (withdrawal.deliveryJob) {
      await cancelDeliveryJob(withdrawal.deliveryJob.id, tx);
    }

    return tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.CANCELLED },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });
  }).then(async (cancelled) => {
    if (assignment) {
      await releaseBotAssignmentCapacity(assignment.id, BotAssignmentStatus.CANCELLED);
    }
    return cancelled;
  });
}
