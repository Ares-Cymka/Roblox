/**
 * POST /api/bot/inventory
 *
 * External bot agent reports in-game inventory read from the MM2 screen.
 * Updates bot inventory + product stock so the store can sell available items.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { GameType } from "@prisma/client";
import { isBotAuthorized } from "@/lib/bot-auth";
import { reportBotInventoryFromAgent } from "@/server/services/bot-delivery";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  botRobloxUsername: z.string().min(1),
  game: z.nativeEnum(GameType),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().nonnegative(),
        itemId: z.string().optional(),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyRaw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await reportBotInventoryFromAgent(parsed.data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    botAccountId: result.botAccountId,
    updated: result.updated,
  });
}
