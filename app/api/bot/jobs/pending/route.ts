/**
 * GET /api/bot/jobs/pending
 *
 * Bot agent endpoint — returns queued delivery jobs that an automated
 * bot agent can pick up and execute.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 *
 * Optional query params:
 *   game  — filter by GameType (e.g. ?game=MM2)
 *   limit — max results (default 10, max 50)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotAuthorized } from "@/lib/bot-auth";
import { DeliveryStatus, GameType } from "@prisma/client";
import type { PendingJobSummary } from "@/server/bot-controller/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const gameFilter = searchParams.get("game") as GameType | null;
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);

  const jobs = await prisma.deliveryJob.findMany({
    where: {
      status: DeliveryStatus.QUEUED,
      ...(gameFilter ? {} : {}),
    },
    include: {
      withdrawal: {
        include: {
          items: { include: { product: true } },
          botAssignments: {
            include: { botAccount: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      claim: {
        include: {
          items: { include: { product: true } },
          botAssignments: {
            include: { botAccount: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const summaries = jobs
    .map((job) => {
      const withdrawal = job.withdrawal;
      const claim = job.claim;
      const assignment =
        withdrawal?.botAssignments[0] ?? claim?.botAssignments[0];
      if (!assignment) return null;

      const robloxUsername = withdrawal?.robloxUsername ?? claim?.robloxUsername;
      if (!robloxUsername) return null;

      const firstProduct =
        withdrawal?.items[0]?.product ?? claim?.items[0]?.product;
      const game = (firstProduct?.game ?? "OTHER") as GameType;

      if (gameFilter && game !== gameFilter) return null;

      const items =
        withdrawal?.items.map((wi) => ({
          productId: wi.productId,
          name: wi.product.name,
          quantity: wi.quantity,
          unitValue: wi.unitValue ? Number(wi.unitValue) : 0,
        })) ??
        claim?.items.map((ci) => ({
          productId: ci.productId,
          name: ci.product.name,
          quantity: ci.quantity,
          unitValue: 0,
        })) ??
        [];

      return {
        jobId: job.id,
        withdrawalId: job.withdrawalId,
        claimId: job.claimId,
        game,
        deliveryMethod: "TRADING",
        customerRobloxUsername: robloxUsername,
        botRobloxUsername: assignment.botAccount.robloxUsername,
        privateServerUrl: assignment.botAccount.privateServerUrl,
        items,
        queuedAt: job.createdAt.toISOString(),
      } satisfies PendingJobSummary;
    })
    .filter((s): s is PendingJobSummary => s !== null);

  return NextResponse.json({ jobs: summaries });
}
