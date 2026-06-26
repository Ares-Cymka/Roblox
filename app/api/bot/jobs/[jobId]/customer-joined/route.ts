/**
 * POST /api/bot/jobs/[jobId]/customer-joined
 *
 * Bot agent detected the customer joined the private server.
 * Advances withdrawal WAITING_JOIN → QUEUED and sets the DeliveryJob
 * to QUEUED so it appears in GET /api/bot/jobs/pending for Python automation.
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
    include: {
      withdrawal: {
        include: {
          botAssignments: { orderBy: { assignedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const withdrawal = job.withdrawal;
  if (!withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found for this job" }, { status: 404 });
  }

  if (withdrawal.status !== WithdrawalStatus.WAITING_JOIN) {
    return NextResponse.json(
      { error: `Expected WAITING_JOIN, got ${withdrawal.status}` },
      { status: 409 }
    );
  }

  const assignment = withdrawal.botAssignments[0];

  await prisma.$transaction(async (tx) => {
    await tx.deliveryJob.update({
      where: { id: job.id },
      data: { status: DeliveryStatus.QUEUED },
    });

    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: WithdrawalStatus.QUEUED },
    });

    if (assignment) {
      await tx.botAssignment.update({
        where: { id: assignment.id },
        data: {
          status: BotAssignmentStatus.IN_GAME,
          customerJoinedAt: new Date(),
        },
      });
    }

    await tx.deliveryLog.create({
      data: {
        deliveryJobId: job.id,
        withdrawalId: withdrawal.id,
        message: "[AUTO] Bot detected customer joined private server — delivery queued.",
      },
    });
  });

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    newStatus: DeliveryStatus.QUEUED,
  });
}
