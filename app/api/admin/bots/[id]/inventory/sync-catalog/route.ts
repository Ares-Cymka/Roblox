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

    for (const product of products) {
      await prisma.botInventory.upsert({
        where: {
          botAccountId_productId: {
            botAccountId: bot.id,
            productId: product.id,
          },
        },
        create: {
          botAccountId: bot.id,
          productId: product.id,
          quantity: 0,
          reservedQuantity: 0,
        },
        update: {},
      });
    }

    return NextResponse.json({ linked: products.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to sync catalog to bot inventory" },
      { status: 500 }
    );
  }
}
