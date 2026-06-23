/**
 * POST /api/bot/jobs/[jobId]/start
 *
 * Bot agent notifies the backend that it has picked up the job and
 * is beginning the in-game delivery process.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotAuthorized } from "@/lib/bot-auth";
import { DeliveryStatus, WithdrawalStatus, BotAssignmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.deliveryJob.findUnique({
    where: { id: params.jobId },
    include: { withdrawal: true, claim: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== DeliveryStatus.QUEUED && job.status !== DeliveryStatus.WAITING_USER) {
    return NextResponse.json(
      { error: `Job already in status: ${job.status}` },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.deliveryJob.update({
      where: { id: job.id },
      data: { status: DeliveryStatus.PROCESSING, lockedAt: new Date(), attempts: { increment: 1 } },
    });

    if (job.withdrawalId) {
      await tx.withdrawal.update({
        where: { id: job.withdrawalId },
        data: { status: WithdrawalStatus.PROCESSING },
      });
      const assignment = await tx.botAssignment.findFirst({
        where: { withdrawalId: job.withdrawalId },
      });
      if (assignment) {
        await tx.botAssignment.update({
          where: { id: assignment.id },
          data: { status: BotAssignmentStatus.DELIVERING },
        });
      }
    }

    await tx.deliveryLog.create({
      data: {
        deliveryJobId: job.id,
        withdrawalId: job.withdrawalId,
        claimId: job.claimId,
        message: "[AUTO] Bot agent picked up job and started in-game delivery.",
      },
    });
  });

  return NextResponse.json({ success: true, jobId: job.id, status: DeliveryStatus.PROCESSING });
}
