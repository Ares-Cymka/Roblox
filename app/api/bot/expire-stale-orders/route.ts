import { NextResponse } from "next/server";
import { isBotAuthorized } from "@/lib/bot-auth";
import { cancelWithdrawal } from "@/server/services/withdrawal";
import { prisma } from "@/lib/prisma";
import { WithdrawalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const DEFAULT_TIMEOUT_HOURS = 2;

export async function POST(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const timeoutHours = Number(body.timeoutHours ?? DEFAULT_TIMEOUT_HOURS);
  const cutoff = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

  const stale = await prisma.withdrawal.findMany({
    where: {
      status: {
        in: [
          WithdrawalStatus.WAITING_FRIEND_REQUEST,
          WithdrawalStatus.WAITING_JOIN,
        ],
      },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, withdrawalCode: true, status: true },
  });

  if (stale.length === 0) {
    return NextResponse.json({ expired: 0, total: 0, withdrawalCodes: [] });
  }

  const results = await Promise.allSettled(
    stale.map((w) => cancelWithdrawal(w.id))
  );

  const expired = results.filter((r) => r.status === "fulfilled").length;

  console.log(
    `[expire-stale-orders] Cancelled ${expired}/${stale.length} orders older than ${timeoutHours}h`
  );

  return NextResponse.json({
    expired,
    total: stale.length,
    withdrawalCodes: stale.map((w) => w.withdrawalCode),
  });
}
