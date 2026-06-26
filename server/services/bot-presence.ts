import { BotStatus, GameType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Bots without a heartbeat within this window are treated as offline for delivery. */
export const BOT_HEARTBEAT_MAX_AGE_MS = Number(
  process.env.BOT_HEARTBEAT_MAX_AGE_MS ?? 120_000
);

export function getBotHeartbeatCutoff(): Date {
  return new Date(Date.now() - BOT_HEARTBEAT_MAX_AGE_MS);
}

type BotWithSession = {
  status: BotStatus;
  session?: { lastHeartbeatAt: Date | null } | null;
};

/** True when the bot agent has reported in recently (Roblox client should be running). */
export function isBotLive(bot: BotWithSession): boolean {
  if (bot.status !== BotStatus.ONLINE && bot.status !== BotStatus.BUSY) {
    return false;
  }
  const lastHeartbeat = bot.session?.lastHeartbeatAt;
  if (!lastHeartbeat) return false;
  return lastHeartbeat >= getBotHeartbeatCutoff();
}

/** Mark bots without a fresh heartbeat as OFFLINE so they cannot receive new deliveries. */
export async function syncStaleBotsOffline(game?: GameType): Promise<number> {
  const cutoff = getBotHeartbeatCutoff();

  const stale = await prisma.botAccount.findMany({
    where: {
      status: { in: [BotStatus.ONLINE, BotStatus.BUSY] },
      ...(game ? { game } : {}),
      OR: [
        { session: null },
        { session: { lastHeartbeatAt: null } },
        { session: { lastHeartbeatAt: { lt: cutoff } } },
      ],
    },
    select: { id: true },
  });

  if (stale.length === 0) return 0;

  await prisma.botAccount.updateMany({
    where: { id: { in: stale.map((bot) => bot.id) } },
    data: { status: BotStatus.OFFLINE },
  });

  return stale.length;
}

export async function recordBotHeartbeat(input: {
  botAccountId: string;
  sessionStatus: "IDLE" | "ACTIVE" | "BUSY" | "ERROR";
  currentJobId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date();
  const botStatus =
    input.sessionStatus === "BUSY" ? BotStatus.BUSY : BotStatus.ONLINE;

  await prisma.$transaction([
    prisma.botSession.upsert({
      where: { botAccountId: input.botAccountId },
      create: {
        botAccountId: input.botAccountId,
        status: input.sessionStatus,
        currentJobId: input.currentJobId ?? null,
        lastHeartbeatAt: now,
        metadata: input.metadata as object | undefined,
      },
      update: {
        status: input.sessionStatus,
        currentJobId: input.currentJobId ?? null,
        lastHeartbeatAt: now,
        metadata: input.metadata as object | undefined,
      },
    }),
    prisma.botAccount.update({
      where: { id: input.botAccountId },
      data: { status: botStatus },
    }),
  ]);
}

export async function touchBotPresence(botAccountId: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.botSession.upsert({
      where: { botAccountId },
      create: {
        botAccountId,
        status: "ACTIVE",
        lastHeartbeatAt: now,
      },
      update: {
        lastHeartbeatAt: now,
      },
    }),
    prisma.botAccount.update({
      where: { id: botAccountId },
      data: { status: BotStatus.ONLINE },
    }),
  ]);
}
