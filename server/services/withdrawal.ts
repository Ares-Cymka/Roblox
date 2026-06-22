import {
  GameType,
  WithdrawalStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FRAUD_REVIEW_THRESHOLD,
  generateWithdrawalCode,
} from "@/lib/utils";
import {
  assignBotAndCreateDeliveryJob,
  formatAssignmentPayload,
} from "@/server/services/delivery-request";
import { reserveCustomerInventoryItems } from "@/server/services/customer-inventory";
import { getGameDeliveryConfig } from "@/server/services/game-delivery-config";

export const SUPPORT_REQUIRED_MESSAGE =
  "This withdrawal requires customer service review for fraud protection. Please contact support.";

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
    include: {
      items: { include: { product: true } },
      deliveryJob: true,
      botAssignments: {
        include: { botAccount: true },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  });
}

async function loadWithdrawalById(withdrawalId: string) {
  return prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: {
      items: { include: { product: true } },
      deliveryJob: true,
      botAssignments: {
        include: { botAccount: true },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  });
}

export function formatWithdrawalResponse(
  withdrawal: Prisma.WithdrawalGetPayload<{
    include: {
      items: { include: { product: true } };
      deliveryJob: true;
      botAssignments: { include: { botAccount: true }; take: 1 };
    };
  }>,
  gameConfig?: {
    game: GameType;
    deliveryMethod: string;
    requiresFriend: boolean;
    requiresPrivateServer: boolean;
    requiresCustomerJoin: boolean;
    requiresManualConfirmation: boolean;
    instructions: string | null;
  } | null
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
      ? { status: withdrawal.deliveryJob.status }
      : null,
    supportMessage:
      withdrawal.status === WithdrawalStatus.SUPPORT_REQUIRED
        ? SUPPORT_REQUIRED_MESSAGE
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
      include: {
        items: { include: { product: true } },
        deliveryJob: true,
        botAssignments: { include: { botAccount: true }, take: 1 },
      },
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

  return formatWithdrawalResponse(withdrawal, gameConfig);
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
    withdrawal.status === WithdrawalStatus.FAILED
  ) {
    return { error: `Withdrawal is ${withdrawal.status.toLowerCase()}` as const };
  }

  const updated = await prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: {
      robloxUsername: robloxUsername.trim(),
      status: WithdrawalStatus.QUEUED,
    },
    include: {
      items: { include: { product: true } },
      deliveryJob: true,
      botAssignments: { include: { botAccount: true }, take: 1 },
    },
  });

  const game = updated.items[0]?.product.game;
  const gameConfig = game ? await getGameDeliveryConfig(game) : null;

  return formatWithdrawalResponse(updated, gameConfig);
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
    return {
      error: result.error,
      shortages: result.shortages,
    };
  }

  const updated = await prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: { status: WithdrawalStatus.WAITING_FRIEND_REQUEST },
    include: {
      items: { include: { product: true } },
      deliveryJob: true,
      botAssignments: {
        include: { botAccount: true },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  });

  const gameConfig = await getGameDeliveryConfig(game);
  return formatWithdrawalResponse(updated, gameConfig);
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
    include: { items: true, deliveryJob: true },
  });

  if (!withdrawal) return null;

  if (
    withdrawal.status === WithdrawalStatus.DELIVERED ||
    withdrawal.deliveryJob
  ) {
    throw new Error("Cannot cancel withdrawal after delivery started");
  }

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
      }
    }

    return tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.CANCELLED },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });
  });
}
