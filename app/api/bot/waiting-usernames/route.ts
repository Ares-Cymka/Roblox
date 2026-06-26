/**
 * GET /api/bot/waiting-usernames
 *
 * Returns withdrawals waiting for friend request or game join.
 * The Node.js bot service polls this to know which Roblox usernames
 * to watch for friend requests and presence changes.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotAuthorized } from "@/lib/bot-auth";
import { WithdrawalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const withdrawals = await prisma.withdrawal.findMany({
    where: {
      status: { in: [WithdrawalStatus.WAITING_FRIEND_REQUEST, WithdrawalStatus.WAITING_JOIN] },
      robloxUsername: { not: null },
    },
    include: {
      deliveryJob: { select: { id: true } },
      botAssignments: {
        include: { botAccount: { select: { robloxUsername: true } } },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
      items: { include: { product: { select: { game: true } } }, take: 1 },
    },
  });

  const waiting = withdrawals
    .filter((w) => w.robloxUsername && w.deliveryJob)
    .map((w) => ({
      jobId: w.deliveryJob!.id,
      withdrawalId: w.id,
      customerRobloxUsername: w.robloxUsername!,
      botRobloxUsername: w.botAssignments[0]?.botAccount.robloxUsername ?? null,
      game: w.items[0]?.product.game ?? "OTHER",
      withdrawalStatus: w.status,
    }));

  return NextResponse.json({ waiting });
}
