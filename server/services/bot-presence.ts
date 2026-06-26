import { BotSessionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function recordBotHeartbeat(input: {
  botAccountId: string;
  sessionStatus: "IDLE" | "ACTIVE" | "BUSY" | "ERROR";
  currentJobId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const status = input.sessionStatus as BotSessionStatus;

  await prisma.botSession.upsert({
    where: { botAccountId: input.botAccountId },
    create: {
      botAccountId: input.botAccountId,
      status,
      currentJobId: input.currentJobId,
      lastHeartbeatAt: new Date(),
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
    },
    update: {
      status,
      currentJobId: input.currentJobId,
      lastHeartbeatAt: new Date(),
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });
}
