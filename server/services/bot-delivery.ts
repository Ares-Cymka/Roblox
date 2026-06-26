import {
  BotStatus,
  GameType,
  MM2SessionStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { markDeliveryJobDelivered } from "@/server/services/admin-delivery";
import { touchBotPresence } from "@/server/services/bot-presence";

export interface BotDetectedItem {
  name: string;
  quantity: number;
  itemId?: string;
}

export interface BotInventoryItem {
  name: string;
  quantity: number;
  itemId?: string;
}

function normalizeItemName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateDetectedTradeItems(
  expected: Array<{ name: string; quantity: number }>,
  detected: BotDetectedItem[]
): { ok: true } | { ok: false; error: string } {
  if (detected.length === 0) {
    return { ok: false, error: "No detected items reported" };
  }

  for (const expectedItem of expected) {
    const expectedName = normalizeItemName(expectedItem.name);
    const match = detected.find((item) => {
      const detectedName = normalizeItemName(item.name);
      return (
        detectedName === expectedName ||
        detectedName.includes(expectedName) ||
        expectedName.includes(detectedName)
      );
    });

    if (!match) {
      return {
        ok: false,
        error: `Detected trade missing expected item: ${expectedItem.name}`,
      };
    }

    if (match.quantity < expectedItem.quantity) {
      return {
        ok: false,
        error: `Detected quantity for ${expectedItem.name} is too low (${match.quantity} < ${expectedItem.quantity})`,
      };
    }
  }

  return { ok: true };
}

async function findProductForBotItem(
  game: GameType,
  item: BotInventoryItem,
  db: Pick<typeof prisma, "product"> = prisma
) {
  if (item.itemId?.trim()) {
    const byId = await db.product.findUnique({
      where: { game_itemId: { game, itemId: item.itemId.trim() } },
    });
    if (byId) return byId;
  }

  const normalized = normalizeItemName(item.name);
  const products = await db.product.findMany({
    where: { game },
    select: { id: true, name: true, itemId: true, value: true },
  });

  return (
    products.find((product) => normalizeItemName(product.name) === normalized) ??
    products.find((product) =>
      normalizeItemName(product.name).includes(normalized)
    ) ??
    products.find((product) =>
      normalized.includes(normalizeItemName(product.name))
    ) ??
    null
  );
}

export async function reportBotInventoryFromAgent(input: {
  botRobloxUsername: string;
  game: GameType;
  items: BotInventoryItem[];
}) {
  const bot = await prisma.botAccount.findUnique({
    where: {
      game_robloxUsername: {
        game: input.game,
        robloxUsername: input.botRobloxUsername.trim(),
      },
    },
  });

  if (!bot) {
    return { error: `Bot not found: ${input.botRobloxUsername} (${input.game})` as const };
  }

  if (input.items.length === 0) {
    return { error: "No inventory items provided" as const };
  }

  const resolved: Array<{ productId: string; quantity: number }> = [];

  for (const item of input.items) {
    const product = await findProductForBotItem(input.game, item);
    if (!product) continue;
    resolved.push({
      productId: product.id,
      quantity: Math.max(0, Math.floor(item.quantity)),
    });
  }

  if (resolved.length === 0) {
    return { error: "No matching catalog products found for reported items" as const };
  }

  await prisma.$transaction(async (tx) => {
    for (const entry of resolved) {
      const existing = await tx.botInventory.findUnique({
        where: {
          botAccountId_productId: {
            botAccountId: bot.id,
            productId: entry.productId,
          },
        },
      });

      const reservedQuantity = existing?.reservedQuantity ?? 0;

      await tx.botInventory.upsert({
        where: {
          botAccountId_productId: {
            botAccountId: bot.id,
            productId: entry.productId,
          },
        },
        create: {
          botAccountId: bot.id,
          productId: entry.productId,
          quantity: entry.quantity,
          reservedQuantity: 0,
        },
        update: {
          quantity: Math.max(entry.quantity, reservedQuantity),
        },
      });

      await tx.product.update({
        where: { id: entry.productId },
        data: { stock: entry.quantity },
      });
    }

    await tx.botAccount.update({
      where: { id: bot.id },
      data: { status: BotStatus.ONLINE },
    });
  });

  await touchBotPresence(bot.id);

  return {
    ok: true as const,
    botAccountId: bot.id,
    updated: resolved.length,
  };
}

export async function markBotTradeDetected(
  deliveryJobId: string,
  input?: {
    detectedItems?: BotDetectedItem[];
    proofText?: string;
  }
) {
  const job = await prisma.deliveryJob.findUnique({
    where: { id: deliveryJobId },
    include: {
      withdrawal: {
        include: {
          items: { include: { product: true } },
          mm2Session: true,
        },
      },
    },
  });

  if (!job) return { error: "Delivery job not found" as const };
  if (!job.withdrawal) return { error: "Withdrawal delivery job required" as const };

  if (input?.detectedItems?.length) {
    const validation = validateDetectedTradeItems(
      job.withdrawal.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
      })),
      input.detectedItems
    );
    if (!validation.ok) return { error: validation.error };
  }

  const session = job.withdrawal.mm2Session;
  if (session && session.status !== MM2SessionStatus.TRADE_ACCEPTED) {
    await prisma.mM2DeliverySession.update({
      where: { id: session.id },
      data: {
        status: MM2SessionStatus.TRADE_ACCEPTED,
      },
    });
  }

  await prisma.deliveryLog.create({
    data: {
      deliveryJobId: job.id,
      withdrawalId: job.withdrawalId,
      message:
        input?.proofText ??
        "[BOT] Trade acceptance detected — customer received items from bot.",
      metadata: input?.detectedItems
        ? (JSON.parse(JSON.stringify({ detectedItems: input.detectedItems })) as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return { ok: true as const, status: MM2SessionStatus.TRADE_ACCEPTED };
}

export async function confirmBotTradeDelivery(
  deliveryJobId: string,
  input?: {
    detectedItems?: BotDetectedItem[];
    proofText?: string;
    proofImageUrl?: string;
    requireDetection?: boolean;
  }
) {
  const job = await prisma.deliveryJob.findUnique({
    where: { id: deliveryJobId },
    include: {
      withdrawal: {
        include: {
          items: { include: { product: true } },
          mm2Session: true,
        },
      },
    },
  });

  if (!job) return { error: "Delivery job not found" as const };
  if (!job.withdrawal) return { error: "Withdrawal delivery job required" as const };

  const requireDetection = input?.requireDetection ?? true;

  if (requireDetection) {
    if (!input?.detectedItems?.length) {
      return {
        error:
          "detectedItems required — bot must report which items the customer received",
      };
    }

    const validation = validateDetectedTradeItems(
      job.withdrawal.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
      })),
      input.detectedItems
    );
    if (!validation.ok) return { error: validation.error };
  }

  const result = await markDeliveryJobDelivered(deliveryJobId);
  if ("error" in result) return result;

  if (job.withdrawal.mm2Session) {
    await prisma.mM2DeliverySession.update({
      where: { id: job.withdrawal.mm2Session.id },
      data: {
        status: MM2SessionStatus.DELIVERED,
        tradeCompletedAt: new Date(),
      },
    });
  }

  await prisma.deliveryLog.create({
    data: {
      deliveryJobId: job.id,
      withdrawalId: job.withdrawalId,
      message: "[BOT] Delivery confirmed — customer received item(s) from bot.",
      proofText: input?.proofText ?? null,
      proofImageUrl: input?.proofImageUrl ?? null,
      metadata: input?.detectedItems
        ? (JSON.parse(JSON.stringify({ detectedItems: input.detectedItems })) as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return { ok: true as const, status: "DELIVERED" as const };
}
