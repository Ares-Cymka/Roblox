import {
  BotAssignmentStatus,
  DeliveryStatus,
  GameType,
  MM2SessionStatus,
  WithdrawalStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  markDeliveryJobDelivered,
  markDeliveryJobFailed,
} from "@/server/services/admin-delivery";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Statuses that represent a session that is still actionable (not terminal). */
const ACTIVE_SESSION_STATUSES: MM2SessionStatus[] = [
  MM2SessionStatus.WAITING_FRIEND,
  MM2SessionStatus.WAITING_CUSTOMER_JOIN,
  MM2SessionStatus.CUSTOMER_IN_SERVER,
  MM2SessionStatus.OPERATOR_READY,
  MM2SessionStatus.TRADE_SENT,
  MM2SessionStatus.TRADE_ACCEPTED,
];

/** Statuses that mean the session is complete (terminal). */
const TERMINAL_SESSION_STATUSES: MM2SessionStatus[] = [
  MM2SessionStatus.DELIVERED,
  MM2SessionStatus.FAILED,
  MM2SessionStatus.EXPIRED,
];

/** Customer-facing status label map. */
export const MM2_STATUS_MESSAGES: Record<
  MM2SessionStatus,
  { message: string; variant: "info" | "success" | "warning" | "error" }
> = {
  WAITING_FRIEND: {
    message: "Add the delivery bot as a Roblox friend, then click 'I Sent Friend Request'.",
    variant: "info",
  },
  WAITING_CUSTOMER_JOIN: {
    message: "Click 'Join MM2 Server' and wait in the lobby. The bot will find you.",
    variant: "info",
  },
  CUSTOMER_IN_SERVER: {
    message:
      "You are marked as inside the server. Please wait — the operator will send you a trade request.",
    variant: "info",
  },
  OPERATOR_READY: {
    message: "The delivery operator is ready. Please stay in the MM2 lobby and wait for a trade request.",
    variant: "info",
  },
  TRADE_SENT: {
    message:
      "Trade request sent! Please accept the trade from the assigned bot username only.",
    variant: "info",
  },
  TRADE_ACCEPTED: {
    message: "Trade accepted. Delivery is being confirmed — please keep this page open.",
    variant: "success",
  },
  DELIVERED: {
    message: "Delivery completed. Thank you for using RNGBLOX!",
    variant: "success",
  },
  FAILED: {
    message: "Delivery failed. Please contact support or wait for a retry.",
    variant: "error",
  },
  EXPIRED: {
    message: "This MM2 delivery session expired. Please contact support.",
    variant: "warning",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getSessionById(sessionId: string) {
  return prisma.mM2DeliverySession.findUnique({
    where: { id: sessionId },
  });
}

function isTerminal(status: MM2SessionStatus): boolean {
  return TERMINAL_SESSION_STATUSES.includes(status);
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Creation
// ─────────────────────────────────────────────────────────────────────────────

export async function createMM2Session({
  withdrawalId,
  botAccountId,
  customerRobloxUsername,
  privateServerUrl,
  requiresFriend,
}: {
  withdrawalId: string;
  botAccountId: string;
  customerRobloxUsername: string;
  privateServerUrl: string | null;
  requiresFriend: boolean;
}) {
  const existing = await prisma.mM2DeliverySession.findUnique({
    where: { withdrawalId },
  });
  if (existing) return existing;

  return prisma.mM2DeliverySession.create({
    data: {
      withdrawalId,
      botAccountId,
      customerRobloxUsername,
      privateServerUrl,
      status: requiresFriend
        ? MM2SessionStatus.WAITING_FRIEND
        : MM2SessionStatus.WAITING_CUSTOMER_JOIN,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function customerInServer(
  withdrawalId: string,
  botAssignmentId: string
): Promise<
  | { error: string }
  | {
      ok: true;
      sessionStatus: MM2SessionStatus;
      withdrawalStatus: WithdrawalStatus;
    }
> {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: {
      botAssignments: { orderBy: { assignedAt: "desc" }, take: 1 },
      deliveryJob: true,
      mm2Session: true,
      items: { include: { product: true } },
    },
  });

  if (!withdrawal) return { error: "Withdrawal not found" };

  const blockedStatuses: WithdrawalStatus[] = [
    WithdrawalStatus.DELIVERED,
    WithdrawalStatus.FAILED,
    WithdrawalStatus.CANCELLED,
    WithdrawalStatus.EXPIRED,
    WithdrawalStatus.SUPPORT_REQUIRED,
  ];
  if (blockedStatuses.includes(withdrawal.status)) {
    return {
      error: `Withdrawal is ${withdrawal.status.toLowerCase().replace(/_/g, " ")}`,
    };
  }

  const game = withdrawal.items[0]?.product.game;
  if (game !== GameType.MM2) {
    return { error: "Customer-in-server is only valid for MM2 deliveries" };
  }

  const assignment = withdrawal.botAssignments[0];
  if (!assignment || assignment.id !== botAssignmentId) {
    return { error: "Bot assignment not found" };
  }

  const session = withdrawal.mm2Session;
  if (!session) {
    return { error: "MM2 delivery session not found" };
  }

  // Idempotency: if already past CUSTOMER_IN_SERVER, return current state
  const alreadyProgressed: MM2SessionStatus[] = [
    MM2SessionStatus.CUSTOMER_IN_SERVER,
    MM2SessionStatus.OPERATOR_READY,
    MM2SessionStatus.TRADE_SENT,
    MM2SessionStatus.TRADE_ACCEPTED,
    MM2SessionStatus.DELIVERED,
  ];
  if (alreadyProgressed.includes(session.status)) {
    return {
      ok: true,
      sessionStatus: session.status,
      withdrawalStatus: withdrawal.status,
    };
  }

  if (isTerminal(session.status)) {
    return { error: "MM2 session is already closed" };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.mM2DeliverySession.update({
      where: { id: session.id },
      data: { status: MM2SessionStatus.CUSTOMER_IN_SERVER, customerJoinedAt: now },
    });

    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.PROCESSING },
    });

    if (withdrawal.deliveryJob) {
      await tx.deliveryLog.create({
        data: {
          deliveryJobId: withdrawal.deliveryJob.id,
          withdrawalId,
          message: "Customer marked themselves as inside the MM2 private server.",
        },
      });
    }
  });

  return {
    ok: true,
    sessionStatus: MM2SessionStatus.CUSTOMER_IN_SERVER,
    withdrawalStatus: WithdrawalStatus.PROCESSING,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Operator Ready
// ─────────────────────────────────────────────────────────────────────────────

export async function mm2OperatorReady(
  sessionId: string
): Promise<{ error: string } | { ok: true; session: { status: MM2SessionStatus } }> {
  const session = await getSessionById(sessionId);
  if (!session) return { error: "MM2 session not found" };
  if (isTerminal(session.status)) return { error: "Session is already closed" };

  if (
    session.status === MM2SessionStatus.OPERATOR_READY ||
    session.status === MM2SessionStatus.TRADE_SENT
  ) {
    return { ok: true, session: { status: session.status } };
  }

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: session.withdrawalId },
    include: { deliveryJob: true },
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.mM2DeliverySession.update({
      where: { id: sessionId },
      data: { status: MM2SessionStatus.OPERATOR_READY, operatorReadyAt: now },
    });

    if (withdrawal?.deliveryJob) {
      await tx.deliveryLog.create({
        data: {
          deliveryJobId: withdrawal.deliveryJob.id,
          withdrawalId: session.withdrawalId,
          message: "Operator is ready in the MM2 private server.",
        },
      });
    }
  });

  return { ok: true, session: { status: MM2SessionStatus.OPERATOR_READY } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Customer Found
// ─────────────────────────────────────────────────────────────────────────────

export async function mm2CustomerFound(
  sessionId: string
): Promise<{ error: string } | { ok: true; session: { status: MM2SessionStatus } }> {
  const session = await getSessionById(sessionId);
  if (!session) return { error: "MM2 session not found" };
  if (isTerminal(session.status)) return { error: "Session is already closed" };

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: session.withdrawalId },
    include: { deliveryJob: true },
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (session.status !== MM2SessionStatus.CUSTOMER_IN_SERVER) {
      await tx.mM2DeliverySession.update({
        where: { id: sessionId },
        data: {
          status: MM2SessionStatus.CUSTOMER_IN_SERVER,
          customerJoinedAt: session.customerJoinedAt ?? now,
        },
      });
    }

    if (withdrawal?.deliveryJob) {
      await tx.deliveryLog.create({
        data: {
          deliveryJobId: withdrawal.deliveryJob.id,
          withdrawalId: session.withdrawalId,
          message: `Operator found customer "${session.customerRobloxUsername}" in the MM2 server.`,
        },
      });
    }
  });

  return { ok: true, session: { status: MM2SessionStatus.CUSTOMER_IN_SERVER } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Trade Sent
// ─────────────────────────────────────────────────────────────────────────────

export async function mm2TradeSent(
  sessionId: string
): Promise<{ error: string } | { ok: true; session: { status: MM2SessionStatus } }> {
  const session = await getSessionById(sessionId);
  if (!session) return { error: "MM2 session not found" };
  if (isTerminal(session.status)) return { error: "Session is already closed" };

  if (
    session.status === MM2SessionStatus.TRADE_SENT ||
    session.status === MM2SessionStatus.TRADE_ACCEPTED
  ) {
    return { ok: true, session: { status: session.status } };
  }

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: session.withdrawalId },
    include: {
      deliveryJob: true,
      botAssignments: { orderBy: { assignedAt: "desc" }, take: 1 },
    },
  });

  if (!withdrawal) return { error: "Withdrawal not found" };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.mM2DeliverySession.update({
      where: { id: sessionId },
      data: { status: MM2SessionStatus.TRADE_SENT, tradeStartedAt: now },
    });

    // Update bot assignment to DELIVERING
    const assignment = withdrawal.botAssignments[0];
    if (assignment) {
      await tx.botAssignment.update({
        where: { id: assignment.id },
        data: { status: BotAssignmentStatus.DELIVERING },
      });
    }

    // Make sure withdrawal is in PROCESSING
    await tx.withdrawal.update({
      where: { id: session.withdrawalId },
      data: { status: WithdrawalStatus.PROCESSING },
    });

    if (withdrawal.deliveryJob) {
      await tx.deliveryLog.create({
        data: {
          deliveryJobId: withdrawal.deliveryJob.id,
          withdrawalId: session.withdrawalId,
          message: `MM2 trade request sent to customer "${session.customerRobloxUsername}".`,
        },
      });
    }
  });

  return { ok: true, session: { status: MM2SessionStatus.TRADE_SENT } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Trade Completed
// ─────────────────────────────────────────────────────────────────────────────

export async function mm2TradeCompleted(sessionId: string): Promise<
  | { error: string }
  | { ok: true; session: { status: MM2SessionStatus } }
> {
  const session = await getSessionById(sessionId);
  if (!session) return { error: "MM2 session not found" };

  if (session.status === MM2SessionStatus.DELIVERED) {
    return { ok: true, session: { status: MM2SessionStatus.DELIVERED } };
  }

  if (
    session.status === MM2SessionStatus.FAILED ||
    session.status === MM2SessionStatus.EXPIRED
  ) {
    return { error: "Session is already closed as failed/expired" };
  }

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: session.withdrawalId },
    include: { deliveryJob: true },
  });

  if (!withdrawal?.deliveryJob) {
    return { error: "Delivery job not found" };
  }

  // Delegate to the safe admin-delivery service which handles all inventory deduction
  const result = await markDeliveryJobDelivered(withdrawal.deliveryJob.id);
  if ("error" in result) return { error: result.error };

  const now = new Date();
  await prisma.mM2DeliverySession.update({
    where: { id: sessionId },
    data: { status: MM2SessionStatus.DELIVERED, tradeCompletedAt: now },
  });

  return { ok: true, session: { status: MM2SessionStatus.DELIVERED } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Trade Failed
// ─────────────────────────────────────────────────────────────────────────────

export async function mm2TradeFailed(
  sessionId: string,
  reason: string
): Promise<{ error: string } | { ok: true; session: { status: MM2SessionStatus } }> {
  const session = await getSessionById(sessionId);
  if (!session) return { error: "MM2 session not found" };

  if (session.status === MM2SessionStatus.FAILED) {
    return { ok: true, session: { status: MM2SessionStatus.FAILED } };
  }

  if (session.status === MM2SessionStatus.DELIVERED) {
    return { error: "Cannot mark failed: trade already completed" };
  }

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: session.withdrawalId },
    include: { deliveryJob: true },
  });

  if (!withdrawal?.deliveryJob) {
    return { error: "Delivery job not found" };
  }

  // Delegate to the safe admin-delivery service which handles all inventory release
  const result = await markDeliveryJobFailed(
    withdrawal.deliveryJob.id,
    reason || "MM2 trade failed"
  );
  if ("error" in result) return { error: result.error };

  const now = new Date();
  await prisma.mM2DeliverySession.update({
    where: { id: sessionId },
    data: { status: MM2SessionStatus.FAILED, tradeFailedAt: now },
  });

  return { ok: true, session: { status: MM2SessionStatus.FAILED } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: format session for API response
// ─────────────────────────────────────────────────────────────────────────────

export function formatMM2Session(session: {
  id: string;
  withdrawalId: string;
  botAccountId: string;
  customerRobloxUsername: string;
  privateServerUrl: string | null;
  status: MM2SessionStatus;
  customerJoinedAt: Date | null;
  operatorReadyAt: Date | null;
  tradeStartedAt: Date | null;
  tradeCompletedAt: Date | null;
  tradeFailedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: session.id,
    withdrawalId: session.withdrawalId,
    botAccountId: session.botAccountId,
    customerRobloxUsername: session.customerRobloxUsername,
    privateServerUrl: session.privateServerUrl,
    status: session.status,
    customerJoinedAt: session.customerJoinedAt?.toISOString() ?? null,
    operatorReadyAt: session.operatorReadyAt?.toISOString() ?? null,
    tradeStartedAt: session.tradeStartedAt?.toISOString() ?? null,
    tradeCompletedAt: session.tradeCompletedAt?.toISOString() ?? null,
    tradeFailedAt: session.tradeFailedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    statusMessage: MM2_STATUS_MESSAGES[session.status] ?? null,
  };
}

export { ACTIVE_SESSION_STATUSES, TERMINAL_SESSION_STATUSES };
