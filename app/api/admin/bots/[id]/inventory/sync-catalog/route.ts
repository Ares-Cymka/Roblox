import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const bot = await prisma.botAccount.findUnique({
      where: { id: params.id },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { game: bot.game },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: `No ${bot.game} products in catalog. Import products first.` },
        { status: 400 }
      );
    }

    const defaultQuantity = 10;

    for (const product of products) {
      const existing = await prisma.botInventory.findUnique({
        where: {
          botAccountId_productId: {
            botAccountId: bot.id,
            productId: product.id,
          },
        },
      });

      if (existing) {
        await prisma.botInventory.update({
          where: { id: existing.id },
          data: {
            quantity:
              existing.quantity === 0 ? defaultQuantity : existing.quantity,
          },
        });
        continue;
      }

      await prisma.botInventory.create({
        data: {
          botAccountId: bot.id,
          productId: product.id,
          quantity: defaultQuantity,
          reservedQuantity: 0,
        },
      });
    }

    return NextResponse.json({
      linked: products.length,
      defaultQuantity,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to sync catalog to bot inventory" },
      { status: 500 }
    );
  }
}
