import { BotStatus, GameType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateBotAccountInput,
  UpdateBotAccountInput,
  UpsertBotInventoryInput,
} from "@/server/validators/bot";

function defaultProfileUrl(username: string): string {
  return `https://www.roblox.com/users/search?keyword=${encodeURIComponent(username)}`;
}

function normalizeOptionalUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listBotAccounts() {
  return prisma.botAccount.findMany({
    orderBy: [{ game: "asc" }, { robloxUsername: "asc" }],
    include: {
      _count: { select: { inventories: true } },
    },
  });
}

export async function getBotAccountById(id: string) {
  return prisma.botAccount.findUnique({
    where: { id },
    include: {
      inventories: {
        orderBy: { updatedAt: "desc" },
        include: { product: true },
      },
      _count: { select: { assignments: true } },
    },
  });
}

export async function createBotAccount(input: CreateBotAccountInput) {
  const robloxUsername = input.robloxUsername.trim();
  const profileUrl =
    normalizeOptionalUrl(input.profileUrl) ?? defaultProfileUrl(robloxUsername);

  return prisma.botAccount.create({
    data: {
      game: input.game as GameType,
      robloxUsername,
      robloxUserId: normalizeOptionalString(input.robloxUserId),
      profileUrl,
      privateServerUrl: normalizeOptionalUrl(input.privateServerUrl),
      status: input.status as BotStatus,
      maxConcurrentDeliveries: input.maxConcurrentDeliveries,
    },
  });
}

export async function updateBotAccount(id: string, input: UpdateBotAccountInput) {
  const existing = await prisma.botAccount.findUnique({ where: { id } });
  if (!existing) return null;

  const robloxUsername = input.robloxUsername?.trim() ?? existing.robloxUsername;
  const data: Prisma.BotAccountUpdateInput = {};

  if (input.game !== undefined) data.game = input.game as GameType;
  if (input.robloxUsername !== undefined) data.robloxUsername = robloxUsername;
  if (input.robloxUserId !== undefined) {
    data.robloxUserId = normalizeOptionalString(input.robloxUserId);
  }
  if (input.profileUrl !== undefined) {
    data.profileUrl =
      normalizeOptionalUrl(input.profileUrl) ?? defaultProfileUrl(robloxUsername);
  }
  if (input.privateServerUrl !== undefined) {
    data.privateServerUrl = normalizeOptionalUrl(input.privateServerUrl);
  }
  if (input.status !== undefined) data.status = input.status as BotStatus;
  if (input.maxConcurrentDeliveries !== undefined) {
    data.maxConcurrentDeliveries = input.maxConcurrentDeliveries;
  }

  return prisma.botAccount.update({ where: { id }, data });
}

export async function deleteBotAccount(id: string) {
  return prisma.botAccount.delete({ where: { id } });
}

export async function listProductsForGame(game: GameType) {
  return prisma.product.findMany({
    where: { game },
    orderBy: { name: "asc" },
    select: { id: true, name: true, itemId: true, game: true, rarity: true },
  });
}

export async function upsertBotInventory(
  botAccountId: string,
  input: UpsertBotInventoryInput
) {
  const bot = await prisma.botAccount.findUnique({ where: { id: botAccountId } });
  if (!bot) return { error: "Bot not found" as const };

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) return { error: "Product not found" as const };
  if (product.game !== bot.game) {
    return { error: "Product game must match bot game" as const };
  }
  if (input.reservedQuantity > input.quantity) {
    return { error: "Reserved quantity cannot exceed total quantity" as const };
  }

  const inventory = await prisma.botInventory.upsert({
    where: {
      botAccountId_productId: {
        botAccountId,
        productId: input.productId,
      },
    },
    create: {
      botAccountId,
      productId: input.productId,
      quantity: input.quantity,
      reservedQuantity: input.reservedQuantity,
    },
    update: {
      quantity: input.quantity,
      reservedQuantity: input.reservedQuantity,
    },
    include: { product: true },
  });

  return { inventory };
}

export async function updateBotInventoryItem(
  botAccountId: string,
  inventoryId: string,
  data: { quantity?: number; reservedQuantity?: number }
) {
  const existing = await prisma.botInventory.findFirst({
    where: { id: inventoryId, botAccountId },
  });
  if (!existing) return null;

  const quantity = data.quantity ?? existing.quantity;
  const reservedQuantity = data.reservedQuantity ?? existing.reservedQuantity;
  if (reservedQuantity > quantity) {
    throw new Error("Reserved quantity cannot exceed total quantity");
  }

  return prisma.botInventory.update({
    where: { id: inventoryId },
    data: { quantity, reservedQuantity },
    include: { product: true },
  });
}

export async function deleteBotInventoryItem(botAccountId: string, inventoryId: string) {
  const existing = await prisma.botInventory.findFirst({
    where: { id: inventoryId, botAccountId },
  });
  if (!existing) return null;

  return prisma.botInventory.delete({ where: { id: inventoryId } });
}

export async function fillBotTestStock(botAccountId: string, minQuantity = 10) {
  const bot = await prisma.botAccount.findUnique({
    where: { id: botAccountId },
    include: { inventories: true },
  });

  if (!bot) return { error: "Bot not found" as const };

  let updated = 0;

  for (const inventory of bot.inventories) {
    const nextQuantity = Math.max(
      inventory.quantity,
      minQuantity,
      inventory.reservedQuantity
    );

    if (nextQuantity === inventory.quantity) continue;

    await prisma.botInventory.update({
      where: { id: inventory.id },
      data: { quantity: nextQuantity },
    });
    updated++;
  }

  return { updated, total: bot.inventories.length, minQuantity };
}
