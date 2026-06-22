import {
  BotAssignmentStatus,
  CustomerInventoryLogReason,
  DeliveryStatus,
  WithdrawalStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameDeliveryConfig } from "@/server/services/game-delivery-config";
import { assignBotAndCreateDeliveryJob } from "@/server/services/delivery-request";
import { syncBotCurrentDeliveries } from "@/server/services/bot-capacity";

const supportWithdrawalInclude = {
  customer: { select: { id: true, email: true, robloxUsername: true } },
  items: { include: { product: true } },
  botAssignments: {
    include: { botAccount: true },
    orderBy: { assignedAt: "desc" as const },
    take: 1,
  },
  deliveryJob: {
    include: {
      logs: { orderBy: { createdAt: "desc" as const }, take: 50 },
    },
  },
  supportNotes: {
    include: { adminUser: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

type SupportWithdrawal = {
  id: string;
  withdrawalCode: string;
  status: WithdrawalStatus;
  customerId: string | null;
  sessionId: string | null;
  robloxUsername: string | null;
  totalValue: unknown;
  supportReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; email: string | null; robloxUsername: string | null } | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: { name: string; game: string; rarity: string | null; value: unknown };
  }>;
  botAssignments: Array<{
    id: string;
    status: BotAssignmentStatus;
    botAccountId: string;
    botAccount: { robloxUsername: string; profileUrl: string; privateServerUrl: string | null };
  }>;
  deliveryJob: {
    id: string;
    status: DeliveryStatus;
    logs: Array<{ id: string; level: string; message: string; proofText: string | null; proofImageUrl: string | null; createdAt: Date }>;
  } | null;
  supportNotes: Array<{
    id: string;
    note: string;
    createdAt: Date;
    adminUser: { id: string; email: string; name: string | null } | null;
  }>;
};

function formatSupportWithdrawal(w: SupportWithdrawal) {
  const items = w.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    game: item.product.game,
    rarity: item.product.rarity,
    quantity: item.quantity,
    value: item.product.value ? Number(item.product.value) : 0,
  }));

  const assignment = w.botAssignments[0];
  const game = items[0]?.game ?? null;

  return {
    id: w.id,
    withdrawalCode: w.withdrawalCode,
    status: w.status,
    customerId: w.customerId,
    sessionId: w.sessionId,
    robloxUsername: w.robloxUsername,
    totalValue: Number(w.totalValue),
    supportReason: w.supportReason,
    createdAt: w.createdAt,
    game,
    customer: w.customer,
    items,
    assignment: assignment
      ? {
          id: assignment.id,
          status: assignment.status,
          bot: {
            robloxUsername: assignment.botAccount.robloxUsername,
            profileUrl: assignment.botAccount.profileUrl,
            privateServerUrl: assignment.botAccount.privateServerUrl,
          },
        }
      : null,
    deliveryJob: w.deliveryJob
      ? {
          id: w.deliveryJob.id,
          status: w.deliveryJob.status,
          logs: w.deliveryJob.logs.map((log) => ({
            id: log.id,
            level: log.level,
            message: log.message,
            proofText: log.proofText,
            proofImageUrl: log.proofImageUrl,
            createdAt: log.createdAt,
          })),
        }
      : null,
    supportNotes: w.supportNotes,
  };
}

export async function listSupportWithdrawals(limit = 100) {
  const rows = await prisma.withdrawal.findMany({
    where: { status: WithdrawalStatus.SUPPORT_REQUIRED },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: supportWithdrawalInclude,
  });

  return rows.map(formatSupportWithdrawal);
}

export async function getSupportWithdrawal(withdrawalId: string) {
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: supportWithdrawalInclude,
  });

  if (!w) return null;
  return formatSupportWithdrawal(w);
}

export async function addSupportNote(
  withdrawalId: string,
  note: string,
  adminUserId?: string
) {
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { deliveryJob: true },
  });

  if (!w) return { error: "Withdrawal not found" as const };

  const supportNote = await prisma.supportNote.create({
    data: { withdrawalId, note, adminUserId: adminUserId ?? null },
    include: { adminUser: { select: { id: true, email: true, name: true } } },
  });

  // Append to delivery job log if job exists
  if (w.deliveryJob) {
    await prisma.deliveryLog.create({
      data: {
        deliveryJobId: w.deliveryJob.id,
        withdrawalId,
        message: `Support note added: ${note}`,
      },
    });
  }

  return { supportNote };
}

export async function approveSupportWithdrawal(
  withdrawalId: string,
  adminUserId?: string
) {
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: {
      items: { include: { product: true } },
      deliveryJob: true,
      botAssignments: {
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!w) return { error: "Withdrawal not found" as const };
  if (w.status !== WithdrawalStatus.SUPPORT_REQUIRED) {
    return { error: "Withdrawal is not in SUPPORT_REQUIRED status" as const };
  }

  // Prevent duplicate approval
  if (w.deliveryJob) {
    return { error: "Delivery job already exists for this withdrawal" as const };
  }

  const items = w.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    name: item.product.name,
  }));

  const game = w.items[0]?.product.game;
  if (!game) return { error: "No items found on withdrawal" as const };

  const gameConfig = await getGameDeliveryConfig(game);

  // Assign bot and create delivery job
  const result = await assignBotAndCreateDeliveryJob(
    { type: "withdrawal", withdrawalId },
    game,
    items
  );

  if (!result.success) {
    return { error: result.error as string };
  }

  // Determine next withdrawal status from game config
  let nextStatus: WithdrawalStatus;
  if (gameConfig?.requiresFriend) {
    nextStatus = WithdrawalStatus.WAITING_FRIEND_REQUEST;
  } else if (gameConfig?.requiresCustomerJoin) {
    nextStatus = WithdrawalStatus.WAITING_JOIN;
  } else {
    nextStatus = WithdrawalStatus.QUEUED;
  }

  // Get the delivery job that was just created
  const deliveryJob = await prisma.deliveryJob.findUnique({
    where: { withdrawalId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: nextStatus },
    });

    if (deliveryJob) {
      await tx.deliveryLog.create({
        data: {
          deliveryJobId: deliveryJob.id,
          withdrawalId,
          message: "High-value withdrawal approved by support. Entering delivery flow.",
        },
      });
    }

    await tx.supportNote.create({
      data: {
        withdrawalId,
        adminUserId: adminUserId ?? null,
        note: "Withdrawal approved by support for delivery.",
      },
    });
  });

  await syncBotCurrentDeliveries(result.botId);

  return { ok: true as const, nextStatus };
}

export async function rejectSupportWithdrawal(
  withdrawalId: string,
  reason: string,
  adminUserId?: string
) {
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: {
      items: { include: { product: true } },
      deliveryJob: true,
      botAssignments: {
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!w) return { error: "Withdrawal not found" as const };
  if (w.status !== WithdrawalStatus.SUPPORT_REQUIRED) {
    return { error: "Withdrawal is not in SUPPORT_REQUIRED status" as const };
  }
  if (w.deliveryJob) {
    return { error: "Cannot reject: delivery job already exists" as const };
  }

  // Release customer inventory reservations
  const customerInventories = await prisma.customerInventory.findMany({
    where: {
      ...(w.customerId ? { customerId: w.customerId } : { sessionId: w.sessionId ?? undefined }),
    },
  });

  await prisma.$transaction(async (tx) => {
    // Release reserved customer inventory
    for (const item of w.items) {
      const inv = customerInventories.find(
        (ci) => ci.productId === item.productId
      );
      if (inv && inv.reservedQuantity >= item.quantity) {
        await tx.customerInventory.update({
          where: { id: inv.id },
          data: {
            reservedQuantity: Math.max(0, inv.reservedQuantity - item.quantity),
          },
        });

        await tx.customerInventoryLog.create({
          data: {
            customerId: w.customerId ?? null,
            sessionId: w.customerId ? null : (w.sessionId ?? null),
            productId: item.productId,
            delta: item.quantity,
            reason: CustomerInventoryLogReason.WITHDRAW_CANCELLED,
          },
        });
      }
    }

    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.CANCELLED },
    });

    await tx.supportNote.create({
      data: {
        withdrawalId,
        adminUserId: adminUserId ?? null,
        note: `Withdrawal rejected by support: ${reason}`,
      },
    });
  });

  return { ok: true as const };
}

export async function addDeliveryProof(
  deliveryJobId: string,
  proofText: string,
  proofImageUrl?: string
) {
  const job = await prisma.deliveryJob.findUnique({
    where: { id: deliveryJobId },
    include: { withdrawal: { select: { id: true } } },
  });

  if (!job) return { error: "Delivery job not found" as const };

  const log = await prisma.deliveryLog.create({
    data: {
      deliveryJobId,
      withdrawalId: job.withdrawal?.id ?? null,
      level: "INFO",
      message: proofText,
      proofText,
      proofImageUrl: proofImageUrl ?? null,
    },
  });

  return { log };
}
