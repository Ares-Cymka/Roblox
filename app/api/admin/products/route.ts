import { NextRequest, NextResponse } from "next/server";
import { GameType } from "@prisma/client";
import { listProductsForGame } from "@/server/services/order";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const game = request.nextUrl.searchParams.get("game")?.trim().toUpperCase();

  if (!game || !(Object.values(GameType) as string[]).includes(game)) {
    return NextResponse.json(
      { error: "Valid game query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const products = await listProductsForGame(game as GameType);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}
