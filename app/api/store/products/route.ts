import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BotStatus } from "@prisma/client";
import { isBotLive, syncStaleBotsOffline } from "@/server/services/bot-presence";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await syncStaleBotsOffline();

    const products = await prisma.product.findMany({
      where: {
        value: { not: null, gt: 0 },
      },
      orderBy: [{ game: "asc" }, { name: "asc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        game: true,
        itemId: true,
        rarity: true,
        value: true,
        imageUrl: true,
        botInventories: {
          where: {
            botAccount: {
              status: { in: [BotStatus.ONLINE, BotStatus.BUSY] },
            },
          },
          select: {
            quantity: true,
            reservedQuantity: true,
            botAccount: {
              select: {
                status: true,
                session: { select: { lastHeartbeatAt: true } },
              },
            },
          },
        },
      },
    });

    const inStock = products
      .map((product) => {
        const stock = product.botInventories
          .filter((entry) => isBotLive(entry.botAccount))
          .reduce(
            (sum, entry) =>
              sum + Math.max(0, entry.quantity - entry.reservedQuantity),
            0
          );

        return {
          id: product.id,
          name: product.name,
          game: product.game,
          itemId: product.itemId,
          rarity: product.rarity,
          price: product.value ? Number(product.value) : 0,
          imageUrl: product.imageUrl,
          stock,
        };
      })
      .filter((product) => product.stock > 0);

    return NextResponse.json({ products: inStock });
  } catch {
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
