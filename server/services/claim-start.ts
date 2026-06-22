import {
  BotAssignmentStatus,
  BotStatus,
  ClaimStatus,
  DeliveryStatus,
  GameType,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type StartClaimErrorCode =
  | "Claim not found"
  | "Claim already delivered"
  | "Claim expired"
  | "Invalid claim status"
  | "No bot available"
  | "Not enough bot inventory";

type RequiredItem = { productId: string; quantity: number };

type BotInventorySnapshot = {
  productId: string;
  quantity: number;
  reservedQuantity: number;
};

type BotCandidate = {
  id: string;
  robloxUsername: string;
  status: BotStatus;
  currentDeliveries: number;
  maxConcurrentDeliveries: number;
  profileUrl: string;
  privateServerUrl: string | null;
  inventories: BotInventorySnapshot[];
};

type BotWithInventory = Prisma.BotAccountGetPayload<{
  include: { inventories: true };
}>;

export function getAvailableInventory(
  quantity: number,
  reservedQuantity: number
): number {
  return quantity - reservedQuantity;
}

export function botHasSufficientInventory(
  botInventories: Array<{
    productId: string;
    quantity: number;
    reservedQuantity: number;
  }>,
  requiredItems: RequiredItem[]
): boolean {
  return requiredItems.every((item) => {
    const inventory = botInventories.find(
      (entry) => entry.productId === item.productId
    );
    if (!inventory) return false;
    return (
      getAvailableInventory(inventory.quantity, inventory.reservedQuantity) >=
      item.quantity
    );
  });
}

export function selectEligibleBot(
  bots: BotCandidate[],
  requiredItems: RequiredItem[]
): BotCandidate | null {
  const eligible = bots
    .filter(
      (bot) =>
        bot.status === BotStatus.ONLINE &&
        bot.currentDeliveries < bot.maxConcurrentDeliveries &&
        botHasSufficientInventory(bot.inventories, requiredItems)
    )
    .sort((a, b) => a.currentDeliveries - b.currentDeliveries);

  return eligible[0] ?? null;
}

function formatClaimItems(
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: {
      name: string;
      game: GameType;
      imageUrl: string | null;
      rarity: string | null;
    };
  }>
) {
  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    game: item.product.game,
    quantity: item.quantity,
    imageUrl: item.product.imageUrl,
    rarity: item.product.rarity,
  }));
}

function formatStartClaimSuccess(
  claim: Prisma.ClaimGetPayload<{
    include: {
      items: { include: { product: true } };
      order: true;
      deliveryJob: true;
      botAssignments: {
        include: { botAccount: true };
        orderBy: { assignedAt: "desc" };
        take: 1;
      };
    };
  }>
) {
  const assignment = claim.botAssignments[0];
  const game = claim.items[0]?.product.game ?? null;

  return {
    claim: {
      id: claim.id,
      claimCode: claim.claimCode,
      status: claim.status,
      robloxUsername: claim.robloxUsername,
      expiresAt: claim.expiresAt,
      createdAt: claim.createdAt,
    },
    order: {
      id: claim.order.id,
      orderCode: claim.order.orderCode,
      status: claim.order.status,
      game,
      createdAt: claim.order.createdAt,
    },
    items: formatClaimItems(claim.items),
    assignment: assignment
      ? {
          id: assignment.id,
          status: assignment.status,
          bot: {
            robloxUsername: assignment.botAccount.robloxUsername,
            profileUrl: assignment.botAccount.profileUrl,
            privateServerUrl: assignment.botAccount.privateServerUrl,
          },
          assignedItems: claim.items.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            quantity: item.quantity,
          })),
        }
      : null,
    deliveryJob: claim.deliveryJob
      ? { status: claim.deliveryJob.status }
      : null,
  };
}

async function loadClaimForStart(claimId: string) {
  return prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      items: { include: { product: true } },
      order: true,
      deliveryJob: true,
      botAssignments: {
        include: { botAccount: true },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  });
}

async function findEligibleBotForClaim(
  game: GameType,
  requiredItems: RequiredItem[]
): Promise<{ bot: BotWithInventory | null; error?: StartClaimErrorCode }> {
  const bots = await prisma.botAccount.findMany({
    where: { game, status: BotStatus.ONLINE },
    include: { inventories: true },
    orderBy: [{ currentDeliveries: "asc" }, { robloxUsername: "asc" }],
  });

  if (bots.length === 0) {
    return { bot: null, error: "No bot available" };
  }

  const botsWithCapacity = bots.filter(
    (bot) => bot.currentDeliveries < bot.maxConcurrentDeliveries
  );

  if (botsWithCapacity.length === 0) {
    return { bot: null, error: "No bot available" };
  }

  const selectedCandidate = selectEligibleBot(botsWithCapacity, requiredItems);
  if (!selectedCandidate) {
    return { bot: null, error: "Not enough bot inventory" };
  }

  const selected =
    botsWithCapacity.find((bot) => bot.id === selectedCandidate.id) ?? null;

  return { bot: selected };
}

export async function startClaim(claimId: string) {
  const claim = await loadClaimForStart(claimId);

  if (!claim) {
    return { error: "Claim not found" as const };
  }

  if (claim.status === ClaimStatus.DELIVERED) {
    return { error: "Claim already delivered" as const };
  }

  if (claim.status === ClaimStatus.EXPIRED) {
    return { error: "Claim expired" as const };
  }

  if (claim.expiresAt && claim.expiresAt < new Date()) {
    return { error: "Claim expired" as const };
  }

  if (
    claim.status === ClaimStatus.CANCELLED ||
    claim.status === ClaimStatus.FAILED
  ) {
    return { error: "Invalid claim status" as const };
  }

  if (claim.deliveryJob && claim.botAssignments[0]) {
    return formatStartClaimSuccess(claim);
  }

  const startableStatuses: ClaimStatus[] = [
    ClaimStatus.PENDING,
    ClaimStatus.USERNAME_LINKED,
  ];

  if (!startableStatuses.includes(claim.status)) {
    if (claim.botAssignments[0]) {
      return formatStartClaimSuccess(claim);
    }
    return { error: "Invalid claim status" as const };
  }

  if (claim.items.length === 0) {
    return { error: "Invalid claim status" as const };
  }

  const game = claim.items[0]!.product.game;
  const requiredItems = claim.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  const { bot, error: botError } = await findEligibleBotForClaim(
    game,
    requiredItems
  );

  if (!bot || botError) {
    return { error: botError ?? "No bot available" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingJob = await tx.deliveryJob.findUnique({
        where: { claimId: claim.id },
      });

      if (existingJob) {
        return;
      }

      for (const item of claim.items) {
        const inventory = await tx.botInventory.findUnique({
          where: {
            botAccountId_productId: {
              botAccountId: bot.id,
              productId: item.productId,
            },
          },
        });

        if (!inventory) {
          throw new Error("NOT_ENOUGH_INVENTORY");
        }

        const available = getAvailableInventory(
          inventory.quantity,
          inventory.reservedQuantity
        );

        if (available < item.quantity) {
          throw new Error("NOT_ENOUGH_INVENTORY");
        }
      }

      await tx.botAssignment.create({
        data: {
          botAccountId: bot.id,
          claimId: claim.id,
          status: BotAssignmentStatus.FRIEND_REQUEST_PENDING,
        },
      });

      for (const item of claim.items) {
        await tx.botInventory.update({
          where: {
            botAccountId_productId: {
              botAccountId: bot.id,
              productId: item.productId,
            },
          },
          data: {
            reservedQuantity: { increment: item.quantity },
          },
        });
      }

      await tx.deliveryJob.create({
        data: {
          claimId: claim.id,
          status: DeliveryStatus.WAITING_USER,
        },
      });

      await tx.claim.update({
        where: { id: claim.id },
        data: { status: ClaimStatus.WAITING_FRIEND_REQUEST },
      });

      await tx.order.update({
        where: { id: claim.orderId },
        data: { status: OrderStatus.CLAIM_STARTED },
      });

      await tx.botAccount.update({
        where: { id: bot.id },
        data: { currentDeliveries: { increment: 1 } },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_ENOUGH_INVENTORY") {
      return { error: "Not enough bot inventory" as const };
    }
    throw error;
  }

  const refreshed = await loadClaimForStart(claimId);
  if (!refreshed) {
    return { error: "Claim not found" as const };
  }

  return formatStartClaimSuccess(refreshed);
}

export async function getClaimAssignmentSummary(claimId: string) {
  const claim = await loadClaimForStart(claimId);
  if (!claim || !claim.botAssignments[0]) return null;
  return formatStartClaimSuccess(claim);
}
