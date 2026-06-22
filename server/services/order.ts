import {
  ClaimStatus,
  GameType,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateClaimCode, generateOrderCode } from "@/lib/utils";
import type {
  ClaimContinueInput,
  CreateTestOrderInput,
} from "@/server/validators/order";

async function generateUniqueOrderCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const orderCode = generateOrderCode();
    const existing = await prisma.order.findUnique({
      where: { orderCode },
      select: { id: true },
    });
    if (!existing) return orderCode;
  }
  throw new Error("Failed to generate unique order code");
}

async function generateUniqueClaimCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const claimCode = generateClaimCode();
    const existing = await prisma.claim.findUnique({
      where: { claimCode },
      select: { id: true },
    });
    if (!existing) return claimCode;
  }
  throw new Error("Failed to generate unique claim code");
}

async function findOrCreateCustomerByUsername(
  robloxUsername: string,
  tx: Prisma.TransactionClient = prisma
) {
  const normalized = robloxUsername.trim();
  const existing = await tx.customer.findFirst({
    where: {
      robloxUsername: {
        equals: normalized,
        mode: "insensitive",
      },
    },
  });

  if (existing) return existing;

  return tx.customer.create({
    data: { robloxUsername: normalized },
  });
}

export async function listOrders(limit = 50) {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
      claims: {
        select: {
          id: true,
          claimCode: true,
          status: true,
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { items: true, claims: true } },
    },
  });
}

export async function createTestOrder(input: CreateTestOrderInput) {
  const productIds = Array.from(new Set(input.items.map((item) => item.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (products.length !== productIds.length) {
    throw new Error("One or more products were not found");
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  for (const product of products) {
    if (product.game !== input.game) {
      throw new Error(`Product "${product.name}" does not belong to ${input.game}`);
    }
  }

  const orderCode = await generateUniqueOrderCode();
  const claimCode = await generateUniqueClaimCode();

  return prisma.$transaction(async (tx) => {
    let customerId: string | undefined;
    if (input.robloxUsername) {
      const customer = await findOrCreateCustomerByUsername(
        input.robloxUsername,
        tx
      );
      customerId = customer.id;
    }

    const order = await tx.order.create({
      data: {
        orderCode,
        status: OrderStatus.PENDING,
        customerId,
        items: {
          create: input.items.map((item) => {
            const product = productById.get(item.productId)!;
            return {
              productId: product.id,
              quantity: item.quantity,
              unitValue: product.value,
            };
          }),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    const claim = await tx.claim.create({
      data: {
        claimCode,
        orderId: order.id,
        customerId,
        robloxUsername: input.robloxUsername ?? null,
        status: ClaimStatus.PENDING,
        items: {
          create: order.items.map((orderItem) => ({
            productId: orderItem.productId,
            orderItemId: orderItem.id,
            quantity: orderItem.quantity,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return { order, claim };
  });
}

export async function lookupClaimByCode(claimCode: string) {
  const claim = await prisma.claim.findUnique({
    where: { claimCode },
    include: {
      order: {
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
        },
      },
      items: {
        include: { product: true },
      },
    },
  });

  if (!claim) return null;

  const game = claim.items[0]?.product.game ?? claim.order.items[0]?.product.game;

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
    items: claim.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      game: item.product.game,
      quantity: item.quantity,
      imageUrl: item.product.imageUrl,
      rarity: item.product.rarity,
    })),
  };
}

export async function continueClaim(input: ClaimContinueInput) {
  const claim = await prisma.claim.findUnique({
    where: { claimCode: input.claimCode },
    include: {
      order: true,
      items: { include: { product: true } },
    },
  });

  if (!claim) {
    return { error: "Claim not found" as const };
  }

  if (
    claim.status === ClaimStatus.DELIVERED ||
    claim.status === ClaimStatus.CANCELLED ||
    claim.status === ClaimStatus.EXPIRED
  ) {
    return { error: `Claim is ${claim.status.toLowerCase()} and cannot be updated` as const };
  }

  const robloxUsername = input.robloxUsername.trim();

  const updated = await prisma.$transaction(async (tx) => {
    const customer = await findOrCreateCustomerByUsername(robloxUsername, tx);

    const nextClaim = await tx.claim.update({
      where: { id: claim.id },
      data: {
        robloxUsername,
        customerId: customer.id,
        status: ClaimStatus.USERNAME_LINKED,
      },
      include: {
        items: { include: { product: true } },
      },
    });

    await tx.order.update({
      where: { id: claim.orderId },
      data: { status: OrderStatus.CLAIM_STARTED, customerId: customer.id },
    });

    return nextClaim;
  });

  const game = updated.items[0]?.product.game;

  return {
    claim: {
      id: updated.id,
      claimCode: updated.claimCode,
      status: updated.status,
      robloxUsername: updated.robloxUsername,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
    },
    order: {
      id: claim.order.id,
      orderCode: claim.order.orderCode,
      status: OrderStatus.CLAIM_STARTED,
      game,
      createdAt: claim.order.createdAt,
    },
    items: updated.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      game: item.product.game,
      quantity: item.quantity,
      imageUrl: item.product.imageUrl,
      rarity: item.product.rarity,
    })),
  };
}

export async function listProductsForGame(game: GameType) {
  return prisma.product.findMany({
    where: { game },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      itemId: true,
      game: true,
      rarity: true,
      value: true,
    },
  });
}
