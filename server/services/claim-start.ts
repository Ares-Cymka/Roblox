import {
  ClaimStatus,
  GameType,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assignBotAndCreateDeliveryJob,
  formatAssignmentPayload,
  type AssignBotErrorCode,
} from "@/server/services/delivery-request";

export type StartClaimErrorCode =
  | "Claim not found"
  | "Claim already delivered"
  | "Claim expired"
  | "Invalid claim status"
  | AssignBotErrorCode;

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
      ? formatAssignmentPayload(
          assignment,
          claim.items.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            quantity: item.quantity,
          }))
        )
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
  const deliveryItems = claim.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    name: item.product.name,
  }));

  const result = await assignBotAndCreateDeliveryJob(
    { type: "claim", claimId: claim.id },
    game,
    deliveryItems
  );

  if (!result.success) {
    return {
      error: result.error,
      shortages: result.shortages,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.claim.update({
      where: { id: claim.id },
      data: { status: ClaimStatus.WAITING_FRIEND_REQUEST },
    });

    await tx.order.update({
      where: { id: claim.orderId },
      data: { status: OrderStatus.CLAIM_STARTED },
    });
  });

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

// Re-export helpers used by tests
export {
  botHasSufficientInventory,
  getAvailableInventory,
  getInventoryShortages,
  selectEligibleBot,
} from "@/server/services/delivery-request";
