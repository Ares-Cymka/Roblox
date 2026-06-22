import { NextRequest, NextResponse } from "next/server";
import { GameType } from "@prisma/client";
import {
  listGameDeliveryConfigs,
  updateGameDeliveryConfig,
} from "@/server/services/game-delivery-config";
import { updateGameConfigSchema } from "@/server/validators/withdrawal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = await listGameDeliveryConfigs();
    return NextResponse.json({ configs });
  } catch {
    return NextResponse.json({ error: "Failed to load game configs" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const game = request.nextUrl.searchParams.get("game")?.trim().toUpperCase();

  if (!game || !(Object.values(GameType) as string[]).includes(game)) {
    return NextResponse.json({ error: "Valid game is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateGameConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const config = await updateGameDeliveryConfig(game as GameType, parsed.data);
    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ error: "Failed to update game config" }, { status: 500 });
  }
}
