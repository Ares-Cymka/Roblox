import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        value: { not: null, gt: 0 },
      },
      orderBy: [{ game: "asc" }, { name: "asc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        game: true,
        rarity: true,
        value: true,
        imageUrl: true,
      },
    });

    return NextResponse.json({
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        game: product.game,
        rarity: product.rarity,
        price: product.value ? Number(product.value) : 0,
        imageUrl: product.imageUrl,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
