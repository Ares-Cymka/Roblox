import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameType, MM2SessionStatus, WithdrawalStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const {
  withdrawalFindUnique,
  mm2SessionFindUnique,
  mm2SessionCreate,
  mm2SessionUpdate,
  deliveryLogCreate,
  botAssignmentUpdate,
  withdrawalUpdate,
  transaction,
  markDeliveryJobDelivered,
  markDeliveryJobFailed,
} = vi.hoisted(() => ({
  withdrawalFindUnique: vi.fn(),
  mm2SessionFindUnique: vi.fn(),
  mm2SessionCreate: vi.fn(),
  mm2SessionUpdate: vi.fn(),
  deliveryLogCreate: vi.fn(),
  botAssignmentUpdate: vi.fn(),
  withdrawalUpdate: vi.fn(),
  transaction: vi.fn(),
  markDeliveryJobDelivered: vi.fn(),
  markDeliveryJobFailed: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    withdrawal: { findUnique: withdrawalFindUnique, update: withdrawalUpdate },
    mM2DeliverySession: {
      findUnique: mm2SessionFindUnique,
      create: mm2SessionCreate,
      update: mm2SessionUpdate,
    },
    deliveryLog: { create: deliveryLogCreate },
    botAssignment: { update: botAssignmentUpdate },
    $transaction: transaction,
  },
}));

vi.mock("@/server/services/admin-delivery", () => ({
  markDeliveryJobDelivered,
  markDeliveryJobFailed,
}));

import {
  createMM2Session,
  customerInServer,
  formatMM2Session,
  mm2OperatorReady,
  mm2TradeSent,
  mm2TradeCompleted,
  mm2TradeFailed,
  mm2CustomerFound,
  MM2_STATUS_MESSAGES,
} from "@/server/services/mm2-delivery";

// ─────────────────────────────────────────────────────────────────────────────
// Test data factories
// ─────────────────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<ReturnType<typeof baseSession>> = {}) {
  return { ...baseSession(), ...overrides };
}

function baseSession() {
  return {
    id: "sess-1",
    withdrawalId: "w-1",
    botAccountId: "bot-1",
    customerRobloxUsername: "TestUser",
    privateServerUrl: "https://example.com/server",
    status: MM2SessionStatus.WAITING_FRIEND,
    customerJoinedAt: null,
    operatorReadyAt: null,
    tradeStartedAt: null,
    tradeCompletedAt: null,
    tradeFailedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

function makeWithdrawal(overrides = {}) {
  return {
    id: "w-1",
    status: WithdrawalStatus.WAITING_FRIEND_REQUEST,
    robloxUsername: "TestUser",
    botAssignments: [{ id: "ba-1", status: "FRIEND_REQUEST_PENDING" }],
    deliveryJob: { id: "dj-1" },
    mm2Session: makeSession(),
    items: [{ product: { game: GameType.MM2 } }],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("createMM2Session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates session with WAITING_FRIEND when requiresFriend=true", async () => {
    mm2SessionFindUnique.mockResolvedValue(null);
    mm2SessionCreate.mockResolvedValue(makeSession());

    await createMM2Session({
      withdrawalId: "w-1",
      botAccountId: "bot-1",
      customerRobloxUsername: "TestUser",
      privateServerUrl: null,
      requiresFriend: true,
    });

    expect(mm2SessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MM2SessionStatus.WAITING_FRIEND,
        }),
      })
    );
  });

  it("creates session with WAITING_CUSTOMER_JOIN when requiresFriend=false", async () => {
    mm2SessionFindUnique.mockResolvedValue(null);
    mm2SessionCreate.mockResolvedValue(makeSession({ status: MM2SessionStatus.WAITING_CUSTOMER_JOIN }));

    await createMM2Session({
      withdrawalId: "w-1",
      botAccountId: "bot-1",
      customerRobloxUsername: "TestUser",
      privateServerUrl: null,
      requiresFriend: false,
    });

    expect(mm2SessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MM2SessionStatus.WAITING_CUSTOMER_JOIN,
        }),
      })
    );
  });

  it("returns existing session without creating duplicate", async () => {
    const existing = makeSession();
    mm2SessionFindUnique.mockResolvedValue(existing);

    const result = await createMM2Session({
      withdrawalId: "w-1",
      botAccountId: "bot-1",
      customerRobloxUsername: "TestUser",
      privateServerUrl: null,
      requiresFriend: true,
    });

    expect(mm2SessionCreate).not.toHaveBeenCalled();
    expect(result).toEqual(existing);
  });
});

describe("customerInServer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when withdrawal not found", async () => {
    withdrawalFindUnique.mockResolvedValue(null);
    const result = await customerInServer("w-1", "ba-1");
    expect(result).toEqual({ error: "Withdrawal not found" });
  });

  it("returns error for non-MM2 game", async () => {
    withdrawalFindUnique.mockResolvedValue(
      makeWithdrawal({ items: [{ product: { game: GameType.GAG2 } }] })
    );
    const result = await customerInServer("w-1", "ba-1");
    expect(result).toEqual({
      error: "Customer-in-server is only valid for MM2 deliveries",
    });
  });

  it("returns error for wrong bot assignment", async () => {
    withdrawalFindUnique.mockResolvedValue(
      makeWithdrawal({ botAssignments: [{ id: "ba-WRONG" }] })
    );
    const result = await customerInServer("w-1", "ba-1");
    expect(result).toEqual({ error: "Bot assignment not found" });
  });

  it("returns error for terminal withdrawal status", async () => {
    withdrawalFindUnique.mockResolvedValue(
      makeWithdrawal({ status: WithdrawalStatus.DELIVERED })
    );
    const result = await customerInServer("w-1", "ba-1");
    expect("error" in result).toBe(true);
  });

  it("returns current state if already CUSTOMER_IN_SERVER (idempotent)", async () => {
    withdrawalFindUnique.mockResolvedValue(
      makeWithdrawal({
        status: WithdrawalStatus.PROCESSING,
        mm2Session: makeSession({ status: MM2SessionStatus.CUSTOMER_IN_SERVER }),
      })
    );

    const result = await customerInServer("w-1", "ba-1");
    expect(result).toEqual({
      ok: true,
      sessionStatus: MM2SessionStatus.CUSTOMER_IN_SERVER,
      withdrawalStatus: WithdrawalStatus.PROCESSING,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("runs transaction and sets CUSTOMER_IN_SERVER", async () => {
    withdrawalFindUnique.mockResolvedValue(
      makeWithdrawal({ status: WithdrawalStatus.WAITING_JOIN })
    );
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        mM2DeliverySession: { update: vi.fn() },
        withdrawal: { update: vi.fn() },
        deliveryLog: { create: vi.fn() },
      };
      await fn(mockTx);
    });

    const result = await customerInServer("w-1", "ba-1");
    expect(result).toEqual({
      ok: true,
      sessionStatus: MM2SessionStatus.CUSTOMER_IN_SERVER,
      withdrawalStatus: WithdrawalStatus.PROCESSING,
    });
    expect(transaction).toHaveBeenCalled();
  });
});

describe("mm2OperatorReady", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when session not found", async () => {
    mm2SessionFindUnique.mockResolvedValue(null);
    const result = await mm2OperatorReady("sess-1");
    expect(result).toEqual({ error: "MM2 session not found" });
  });

  it("returns idempotent response if already OPERATOR_READY", async () => {
    mm2SessionFindUnique.mockResolvedValue(
      makeSession({ status: MM2SessionStatus.OPERATOR_READY })
    );
    const result = await mm2OperatorReady("sess-1");
    expect(result).toEqual({ ok: true, session: { status: MM2SessionStatus.OPERATOR_READY } });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("updates session to OPERATOR_READY and creates log", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.CUSTOMER_IN_SERVER }));
    // withdrawal lookup
    const { prisma } = await import("@/lib/prisma");
    (prisma.withdrawal.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "w-1",
      deliveryJob: { id: "dj-1" },
    });
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        mM2DeliverySession: { update: vi.fn() },
        deliveryLog: { create: vi.fn() },
      };
      await fn(mockTx);
    });

    const result = await mm2OperatorReady("sess-1");
    expect(result).toEqual({ ok: true, session: { status: MM2SessionStatus.OPERATOR_READY } });
    expect(transaction).toHaveBeenCalled();
  });
});

describe("mm2TradeSent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error for terminal session", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.FAILED }));
    const result = await mm2TradeSent("sess-1");
    expect(result).toEqual({ error: "Session is already closed" });
  });

  it("returns idempotent response if already TRADE_SENT", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.TRADE_SENT }));
    const result = await mm2TradeSent("sess-1");
    expect(result).toEqual({ ok: true, session: { status: MM2SessionStatus.TRADE_SENT } });
  });

  it("updates to TRADE_SENT and sets withdrawal to PROCESSING", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.CUSTOMER_IN_SERVER }));
    withdrawalFindUnique.mockResolvedValue({
      id: "w-1",
      deliveryJob: { id: "dj-1" },
      botAssignments: [{ id: "ba-1" }],
    });
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        mM2DeliverySession: { update: vi.fn() },
        botAssignment: { update: vi.fn() },
        withdrawal: { update: vi.fn() },
        deliveryLog: { create: vi.fn() },
      };
      await fn(mockTx);
    });

    const result = await mm2TradeSent("sess-1");
    expect(result).toEqual({ ok: true, session: { status: MM2SessionStatus.TRADE_SENT } });
  });
});

describe("mm2TradeCompleted", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns idempotent if already DELIVERED", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.DELIVERED }));
    const result = await mm2TradeCompleted("sess-1");
    expect(result).toEqual({ ok: true, session: { status: MM2SessionStatus.DELIVERED } });
    expect(markDeliveryJobDelivered).not.toHaveBeenCalled();
  });

  it("returns error if session is FAILED", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.FAILED }));
    const result = await mm2TradeCompleted("sess-1");
    expect("error" in result).toBe(true);
  });

  it("delegates to markDeliveryJobDelivered and updates session", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.TRADE_SENT }));
    withdrawalFindUnique.mockResolvedValue({
      id: "w-1",
      deliveryJob: { id: "dj-1" },
    });
    markDeliveryJobDelivered.mockResolvedValue({ id: "dj-1", status: "DELIVERED" });
    mm2SessionUpdate.mockResolvedValue(makeSession({ status: MM2SessionStatus.DELIVERED }));

    const result = await mm2TradeCompleted("sess-1");
    expect(markDeliveryJobDelivered).toHaveBeenCalledWith("dj-1");
    expect(mm2SessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: MM2SessionStatus.DELIVERED }),
      })
    );
    expect(result).toEqual({ ok: true, session: { status: MM2SessionStatus.DELIVERED } });
  });

  it("does not deduct inventory twice (idempotency — second call exits early)", async () => {
    // First call: session is TRADE_SENT → becomes DELIVERED
    mm2SessionFindUnique
      .mockResolvedValueOnce(makeSession({ status: MM2SessionStatus.TRADE_SENT }))
      // Second call: session is already DELIVERED → exits early
      .mockResolvedValueOnce(makeSession({ status: MM2SessionStatus.DELIVERED }));

    withdrawalFindUnique.mockResolvedValue({
      id: "w-1",
      deliveryJob: { id: "dj-1" },
    });
    markDeliveryJobDelivered.mockResolvedValue({ id: "dj-1", status: "DELIVERED" });
    mm2SessionUpdate.mockResolvedValue(makeSession({ status: MM2SessionStatus.DELIVERED }));

    await mm2TradeCompleted("sess-1");
    await mm2TradeCompleted("sess-1"); // second call — session already DELIVERED, returns early

    // markDeliveryJobDelivered called only once since second call exits early
    expect(markDeliveryJobDelivered).toHaveBeenCalledTimes(1);
  });
});

describe("mm2TradeFailed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when trying to fail a delivered session", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.DELIVERED }));
    const result = await mm2TradeFailed("sess-1", "oops");
    expect("error" in result).toBe(true);
    expect(markDeliveryJobFailed).not.toHaveBeenCalled();
  });

  it("delegates to markDeliveryJobFailed and updates session", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.TRADE_SENT }));
    withdrawalFindUnique.mockResolvedValue({
      id: "w-1",
      deliveryJob: { id: "dj-1" },
    });
    markDeliveryJobFailed.mockResolvedValue({ id: "dj-1", status: "FAILED" });
    mm2SessionUpdate.mockResolvedValue(makeSession({ status: MM2SessionStatus.FAILED }));

    const result = await mm2TradeFailed("sess-1", "Customer declined trade");
    expect(markDeliveryJobFailed).toHaveBeenCalledWith("dj-1", "Customer declined trade");
    expect(result).toEqual({ ok: true, session: { status: MM2SessionStatus.FAILED } });
  });

  it("releases bot reserved inventory via markDeliveryJobFailed", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.CUSTOMER_IN_SERVER }));
    withdrawalFindUnique.mockResolvedValue({
      id: "w-1",
      deliveryJob: { id: "dj-1" },
    });
    markDeliveryJobFailed.mockResolvedValue({ id: "dj-1", status: "FAILED" });
    mm2SessionUpdate.mockResolvedValue(makeSession({ status: MM2SessionStatus.FAILED }));

    await mm2TradeFailed("sess-1", "Bot unavailable");
    expect(markDeliveryJobFailed).toHaveBeenCalledWith("dj-1", "Bot unavailable");
  });
});

describe("mm2CustomerFound", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error for terminal session", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.DELIVERED }));
    const result = await mm2CustomerFound("sess-1");
    expect("error" in result).toBe(true);
  });

  it("creates a log and returns CUSTOMER_IN_SERVER status", async () => {
    mm2SessionFindUnique.mockResolvedValue(makeSession({ status: MM2SessionStatus.OPERATOR_READY }));
    withdrawalFindUnique.mockResolvedValue({
      id: "w-1",
      deliveryJob: { id: "dj-1" },
    });
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        mM2DeliverySession: { update: vi.fn() },
        deliveryLog: { create: vi.fn() },
      };
      await fn(mockTx);
    });

    const result = await mm2CustomerFound("sess-1");
    expect(result).toEqual({ ok: true, session: { status: MM2SessionStatus.CUSTOMER_IN_SERVER } });
  });
});

describe("formatMM2Session", () => {
  it("serializes dates to ISO strings", () => {
    const now = new Date("2024-06-01T12:00:00.000Z");
    const session = makeSession({
      customerJoinedAt: now,
      operatorReadyAt: now,
      tradeStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const formatted = formatMM2Session(session);
    expect(formatted.customerJoinedAt).toBe("2024-06-01T12:00:00.000Z");
    expect(formatted.operatorReadyAt).toBe("2024-06-01T12:00:00.000Z");
    expect(formatted.createdAt).toBe("2024-06-01T12:00:00.000Z");
  });

  it("returns null for null date fields", () => {
    const session = makeSession();
    const formatted = formatMM2Session(session);
    expect(formatted.customerJoinedAt).toBeNull();
    expect(formatted.tradeStartedAt).toBeNull();
  });

  it("includes status message", () => {
    const session = makeSession({ status: MM2SessionStatus.TRADE_SENT });
    const formatted = formatMM2Session(session);
    expect(formatted.statusMessage).toBeDefined();
    expect(formatted.statusMessage?.message).toContain("trade");
  });
});

describe("MM2_STATUS_MESSAGES", () => {
  it("covers all MM2SessionStatus values", () => {
    const allStatuses = Object.values(MM2SessionStatus);
    for (const status of allStatuses) {
      expect(MM2_STATUS_MESSAGES[status]).toBeDefined();
    }
  });

  it("WAITING_FRIEND shows friend request instruction", () => {
    expect(MM2_STATUS_MESSAGES.WAITING_FRIEND.message.toLowerCase()).toContain("friend");
  });

  it("TRADE_SENT shows accept trade instruction", () => {
    expect(MM2_STATUS_MESSAGES.TRADE_SENT.message.toLowerCase()).toContain("accept");
  });
});
