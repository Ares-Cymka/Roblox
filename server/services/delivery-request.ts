import {
  BotAssignmentStatus,
  BotStatus,
  DeliveryMethod,
  DeliveryStatus,
  GameType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncGameBotCapacities } from "@/server/services/bot-capacity";
import { getGameDeliveryConfig } from "@/server/services/game-delivery-config";
import { dispatchDeliveryJob, resolveControllerType } from "@/server/bot-controller/BotControllerService";
import { createMM2Session } from "@/server/services/mm2-delivery";

export type DeliveryItem = {
  productId: string;
  quantity: number;
  name: string;
};

export type AssignBotErrorCode =
  | "No bot available"
  | "Not enough bot inventory";

type BotInventorySnapshot = {
  productId: string;
  quantity: number;
  reservedQuantity: number;
};

export type BotCandidate = {
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
  botInventories: BotInventorySnapshot[],
  requiredItems: Array<{ productId: string; quantity: number }>
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
  requiredItems: Array<{ productId: string; quantity: number }>
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

export function getInventoryShortages(
  bots: BotCandidate[],
  requiredItems: Array<{ productId: string; quantity: number }>,
  productNames: Map<string, string>
) {
  const onlineWithCapacity = bots.filter(
    (bot) =>
      bot.status === BotStatus.ONLINE &&
      bot.currentDeliveries < bot.maxConcurrentDeliveries
  );

  return requiredItems
    .map((item) => {
      let bestAvailable = 0;

      for (const bot of onlineWithCapacity) {
        const inventory = bot.inventories.find(
          (entry) => entry.productId === item.productId
        );
        if (!inventory) continue;

        bestAvailable = Math.max(
          bestAvailable,
          getAvailableInventory(inventory.quantity, inventory.reservedQuantity)
        );
      }

      return {
        productId: item.productId,
        name: productNames.get(item.productId) ?? item.productId,
        required: item.quantity,
        available: bestAvailable,
      };
    })
    .filter((entry) => entry.available < entry.required);
}

export async function findEligibleBot(
  game: GameType,
  requiredItems: Array<{ productId: string; quantity: number }>,
  productNames: Map<string, string>
): Promise<{
  bot: BotWithInventory | null;
  error?: AssignBotErrorCode;
  shortages?: Array<{
    productId: string;
    name: string;
    required: number;
    available: number;
  }>;
}> {
  await syncGameBotCapacities(game);

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
    const shortages = getInventoryShortages(
      botsWithCapacity,
      requiredItems,
      productNames
    );

    if (shortages.length > 0) {
      return { bot: null, error: "Not enough bot inventory", shortages };
    }

    return { bot: null, error: "No bot available" };
  }

  const selected =
    botsWithCapacity.find((bot) => bot.id === selectedCandidate.id) ?? null;

  return { bot: selected };
}

export type DeliveryRequestTarget =
  | { type: "claim"; claimId: string }
  | { type: "withdrawal"; withdrawalId: string };

export async function assignBotAndCreateDeliveryJob(
  target: DeliveryRequestTarget,
  game: GameType,
  items: DeliveryItem[]
): Promise<
  | { success: true; botId: string }
  | { success: false; error: AssignBotErrorCode; shortages?: ReturnType<typeof getInventoryShortages> }
> {
  const requiredItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
  const productNames = new Map(items.map((item) => [item.productId, item.name]));

  const { bot, error, shortages } = await findEligibleBot(
    game,
    requiredItems,
    productNames
  );

  if (!bot || error) {
    return { success: false, error: error ?? "No bot available", shortages };
  }

  // Determine initial bot assignment status based on game delivery config
  const gameConfig = await getGameDeliveryConfig(game);
  const isMailbox = gameConfig?.deliveryMethod === DeliveryMethod.MAILBOX ||
    (!gameConfig?.requiresFriend && !gameConfig?.requiresCustomerJoin);
  const initialAssignmentStatus = isMailbox
    ? BotAssignmentStatus.ASSIGNED
    : BotAssignmentStatus.FRIEND_REQUEST_PENDING;

  try {
    await prisma.$transaction(async (tx) => {
      const existingJob =
        target.type === "claim"
          ? await tx.deliveryJob.findUnique({ where: { claimId: target.claimId } })
          : await tx.deliveryJob.findUnique({
              where: { withdrawalId: target.withdrawalId },
            });

      if (existingJob) return;

      for (const item of requiredItems) {
        const inventory = await tx.botInventory.findUnique({
          where: {
            botAccountId_productId: {
              botAccountId: bot.id,
              productId: item.productId,
            },
          },
        });

        if (!inventory) throw new Error("NOT_ENOUGH_INVENTORY");

        const available = getAvailableInventory(
          inventory.quantity,
          inventory.reservedQuantity
        );

        if (available < item.quantity) throw new Error("NOT_ENOUGH_INVENTORY");
      }

      await tx.botAssignment.create({
        data: {
          botAccountId: bot.id,
          claimId: target.type === "claim" ? target.claimId : null,
          withdrawalId: target.type === "withdrawal" ? target.withdrawalId : null,
          status: initialAssignmentStatus,
        },
      });

      for (const item of requiredItems) {
        await tx.botInventory.update({
          where: {
            botAccountId_productId: {
              botAccountId: bot.id,
              productId: item.productId,
            },
          },
          data: { reservedQuantity: { increment: item.quantity } },
        });
      }

      const deliveryJob = await tx.deliveryJob.create({
        data: {
          claimId: target.type === "claim" ? target.claimId : null,
          withdrawalId: target.type === "withdrawal" ? target.withdrawalId : null,
          status: DeliveryStatus.QUEUED,
          controllerType: resolveControllerType(),
        },
      });

      await tx.deliveryLog.create({
        data: {
          deliveryJobId: deliveryJob.id,
          claimId: target.type === "claim" ? target.claimId : null,
          withdrawalId: target.type === "withdrawal" ? target.withdrawalId : null,
          message: `Bot ${bot.robloxUsername} assigned for ${game} delivery`,
        },
      });

      await tx.botAccount.update({
        where: { id: bot.id },
        data: { currentDeliveries: { increment: 1 } },
      });
    });

    // Create MM2 delivery session after the transaction succeeds
    if (game === GameType.MM2 && target.type === "withdrawal") {
      const customerRobloxUsername =
        (
          await prisma.withdrawal.findUnique({
            where: { id: target.withdrawalId },
            select: { robloxUsername: true },
          })
        )?.robloxUsername ?? "";

      await createMM2Session({
        withdrawalId: target.withdrawalId,
        botAccountId: bot.id,
        customerRobloxUsername,
        privateServerUrl: bot.privateServerUrl ?? null,
        requiresFriend: gameConfig?.requiresFriend ?? true,
      }).catch((err) => {
        console.error("[delivery-request] Failed to create MM2 session:", err);
      });
    }
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_ENOUGH_INVENTORY") {
      return { success: false, error: "Not enough bot inventory" };
    }
    throw err;
  }

  return { success: true, botId: bot.id };
}

export function formatAssignmentPayload(
  assignment: Prisma.BotAssignmentGetPayload<{ include: { botAccount: true } }>,
  items: Array<{ productId: string; name: string; quantity: number }>
) {
  return {
    id: assignment.id,
    status: assignment.status,
    bot: {
      robloxUsername: assignment.botAccount.robloxUsername,
      profileUrl: assignment.botAccount.profileUrl,
      privateServerUrl: assignment.botAccount.privateServerUrl,
    },
    assignedItems: items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
    })),
  };
}
