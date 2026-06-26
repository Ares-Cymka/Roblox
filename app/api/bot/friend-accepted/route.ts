/**
 * POST /api/bot/friend-accepted
 *
 * Bot agent reports it auto-accepted a Roblox friend request.
 * Advances the withdrawal from WAITING_FRIEND_REQUEST → WAITING_JOIN
 * and logs the event so the customer UI can update.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 *
 * Body (JSON):
 *   customerRobloxUsername — the customer whose request was accepted
 *   botRobloxUsername      — the bot that accepted it
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotAuthorized } from "@/lib/bot-auth";
import { WithdrawalStatus, BotAssignmentStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  customerRobloxUsername: z.string().min(1),
  botRobloxUsername: z.string().min(1),
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

  const { customerRobloxUsername, botRobloxUsername } = parsed.data;

  const withdrawal = await prisma.withdrawal.findFirst({
    where: {
      robloxUsername: customerRobloxUsername,
      status: WithdrawalStatus.WAITING_FRIEND_REQUEST,
    },
    include: {
      deliveryJob: { select: { id: true } },
      botAssignments: {
        include: { botAccount: { select: { robloxUsername: true } } },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!withdrawal) {
    return NextResponse.json(
      { error: `No WAITING_FRIEND_REQUEST withdrawal found for ${customerRobloxUsername}` },
      { status: 404 }
    );
  }

  if (!withdrawal.deliveryJob) {
    return NextResponse.json({ error: "No delivery job attached to withdrawal" }, { status: 404 });
  }

  const assignment = withdrawal.botAssignments[0];

  await prisma.$transaction(async (tx) => {
    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: WithdrawalStatus.WAITING_JOIN },
    });

    if (assignment) {
      await tx.botAssignment.update({
        where: { id: assignment.id },
        data: { status: BotAssignmentStatus.FRIEND_REQUEST_SENT },
      });
    }

    await tx.deliveryLog.create({
      data: {
        deliveryJobId: withdrawal.deliveryJob!.id,
        withdrawalId: withdrawal.id,
        message: `[AUTO] Bot ${botRobloxUsername} accepted friend request from ${customerRobloxUsername}.`,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    jobId: withdrawal.deliveryJob.id,
    withdrawalId: withdrawal.id,
    newStatus: WithdrawalStatus.WAITING_JOIN,
  });
}
