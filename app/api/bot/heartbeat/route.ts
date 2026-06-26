/**
 * POST /api/bot/heartbeat
 *
 * External bot agents POST a heartbeat to report their live status.
 * Creates or updates a BotSession record for the corresponding BotAccount.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 *
 * Body (JSON):
 *   botRobloxUsername  — the bot's Roblox username
 *   game               — GameType enum value
 *   status             — IDLE | ACTIVE | BUSY | ERROR
 *   currentJobId?      — the job the bot is currently processing
 *   metadata?          — arbitrary JSON (e.g. { version, platform })
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotAuthorized } from "@/lib/bot-auth";
import { recordBotHeartbeat } from "@/server/services/bot-presence";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  botRobloxUsername: z.string().min(1),
  game: z.enum(["MM2", "ADOPT_ME", "SAB", "GAG2", "OTHER"]),
  status: z.enum(["IDLE", "ACTIVE", "BUSY", "ERROR"]),
  currentJobId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyRaw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const { botRobloxUsername, game, status, currentJobId, metadata } = parsed.data;

  const bot = await prisma.botAccount.findFirst({
    where: { robloxUsername: botRobloxUsername, game },
  });

  if (!bot) {
    return NextResponse.json(
      { error: `Bot not found: ${botRobloxUsername} (${game})` },
      { status: 404 }
    );
  }

  await recordBotHeartbeat({
    botAccountId: bot.id,
    sessionStatus: status,
    currentJobId: currentJobId ?? null,
    metadata,
  });

  const session = await prisma.botSession.findUnique({
    where: { botAccountId: bot.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Failed to record heartbeat" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    botAccountId: bot.id,
    sessionId: session.id,
    status: session.status,
    lastHeartbeatAt: session.lastHeartbeatAt,
  });
}
