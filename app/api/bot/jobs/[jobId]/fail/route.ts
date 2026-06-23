/**
 * POST /api/bot/jobs/[jobId]/fail
 *
 * Bot agent reports that the in-game delivery failed.
 * Marks the job FAILED and releases reserved inventory.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 *
 * Body (JSON):
 *   error     — required, human-readable error description
 *   retryable — boolean, whether this error can be retried automatically
 *   metadata? — arbitrary JSON
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotAuthorized } from "@/lib/bot-auth";
import { DeliveryStatus, WithdrawalStatus, BotAssignmentStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  error: z.string().min(1),
  retryable: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyRaw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const { error: failReason, retryable, metadata } = parsed.data;

  const job = await prisma.deliveryJob.findUnique({
    where: { id: params.jobId },
    include: {
      withdrawal: {
        include: {
          items: true,
          botAssignments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status === DeliveryStatus.FAILED || job.status === DeliveryStatus.DELIVERED) {
    return NextResponse.json({ success: true, jobId: job.id, alreadyTerminal: true });
  }

  await prisma.$transaction(async (tx) => {
    const nextStatus = retryable ? DeliveryStatus.RETRYING : DeliveryStatus.FAILED;

    await tx.deliveryJob.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        lastError: failReason,
        ...(retryable ? { nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) } : {}),
      },
    });

    if (job.withdrawalId && job.withdrawal) {
      await tx.withdrawal.update({
        where: { id: job.withdrawalId },
        data: { status: WithdrawalStatus.FAILED },
      });

      const assignment = job.withdrawal.botAssignments[0];
      if (assignment) {
        await tx.botAssignment.update({
          where: { id: assignment.id },
          data: { status: BotAssignmentStatus.FAILED, failureReason: failReason },
        });
        // Release reserved bot inventory
        for (const wi of job.withdrawal.items) {
          await tx.botInventory.updateMany({
            where: { botAccountId: assignment.botAccountId, productId: wi.productId },
            data: { reservedQuantity: { decrement: wi.quantity } },
          });
        }
        await tx.botAccount.update({
          where: { id: assignment.botAccountId },
          data: { currentDeliveries: { decrement: 1 } },
        });
      }
    }

    await tx.deliveryLog.create({
      data: {
        deliveryJobId: job.id,
        withdrawalId: job.withdrawalId,
        claimId: job.claimId,
        level: "ERROR",
        message: `[AUTO] Bot agent reported delivery failed: ${failReason}${retryable ? " (will retry)" : ""}`,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  });

  return NextResponse.json({ success: true, jobId: job.id, status: retryable ? DeliveryStatus.RETRYING : DeliveryStatus.FAILED });
}
