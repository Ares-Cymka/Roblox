/**
 * POST /api/bot/jobs/[jobId]/complete
 *
 * Bot agent reports a successful in-game delivery.
 * Marks the job DELIVERED and the withdrawal/claim DELIVERED.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 *
 * Body (JSON):
 *   proofText?    — human-readable delivery note
 *   proofImageUrl? — optional screenshot/proof URL
 *   metadata?     — arbitrary JSON
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotAuthorized } from "@/lib/bot-auth";
import { DeliveryStatus, WithdrawalStatus, BotAssignmentStatus, CustomerInventoryLogReason } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  proofText: z.string().optional(),
  proofImageUrl: z.string().url().optional(),
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
  const { proofText, proofImageUrl, metadata } = parsed.data;

  const job = await prisma.deliveryJob.findUnique({
    where: { id: params.jobId },
    include: {
      withdrawal: {
        include: {
          items: { include: { product: true } },
          botAssignments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status === DeliveryStatus.DELIVERED) {
    return NextResponse.json({ success: true, jobId: job.id, alreadyDelivered: true });
  }
  if (job.status !== DeliveryStatus.PROCESSING && job.status !== DeliveryStatus.QUEUED) {
    return NextResponse.json({ error: `Cannot complete job in status: ${job.status}` }, { status: 409 });
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.deliveryJob.update({
      where: { id: job.id },
      data: { status: DeliveryStatus.DELIVERED, deliveredAt: now },
    });

    if (job.withdrawalId && job.withdrawal) {
      await tx.withdrawal.update({
        where: { id: job.withdrawalId },
        data: { status: WithdrawalStatus.DELIVERED },
      });

      const assignment = job.withdrawal.botAssignments[0];
      if (assignment) {
        await tx.botAssignment.update({
          where: { id: assignment.id },
          data: { status: BotAssignmentStatus.COMPLETED, completedAt: now },
        });
        // Deduct bot inventory
        for (const wi of job.withdrawal.items) {
          await tx.botInventory.updateMany({
            where: { botAccountId: assignment.botAccountId, productId: wi.productId },
            data: {
              quantity: { decrement: wi.quantity },
              reservedQuantity: { decrement: wi.quantity },
            },
          });
        }
        // Decrement bot currentDeliveries
        await tx.botAccount.update({
          where: { id: assignment.botAccountId },
          data: { currentDeliveries: { decrement: 1 } },
        });
      }

      // Deduct customer inventory
      for (const wi of job.withdrawal.items) {
        const ci = await tx.customerInventory.findFirst({
          where: {
            productId: wi.productId,
            OR: [
              { customerId: job.withdrawal.customerId ?? undefined },
              { sessionId: job.withdrawal.sessionId ?? undefined },
            ],
          },
        });
        if (ci) {
          await tx.customerInventory.update({
            where: { id: ci.id },
            data: {
              quantity: { decrement: wi.quantity },
              reservedQuantity: { decrement: wi.quantity },
            },
          });
          await tx.customerInventoryLog.create({
            data: {
              customerId: job.withdrawal.customerId,
              sessionId: job.withdrawal.sessionId,
              productId: wi.productId,
              delta: -wi.quantity,
              reason: CustomerInventoryLogReason.WITHDRAW_DELIVERED,
            },
          });
        }
      }
    }

    await tx.deliveryLog.create({
        data: {
          deliveryJobId: job.id,
          withdrawalId: job.withdrawalId,
          claimId: job.claimId,
          message: "[AUTO] Bot agent reported delivery completed successfully.",
          proofText: proofText ?? null,
          proofImageUrl: proofImageUrl ?? null,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
  });

  return NextResponse.json({ success: true, jobId: job.id, status: DeliveryStatus.DELIVERED });
}
