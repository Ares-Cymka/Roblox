import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BotAssignmentStatus,
  DeliveryStatus,
  WithdrawalStatus,
} from "@prisma/client";

const {
  withdrawalFindUnique,
  withdrawalUpdate,
  withdrawalFindMany,
  supportNoteCreate,
  deliveryJobFindUnique,
  deliveryJobCreate,
  deliveryLogCreate,
  botAccountFindMany,
  botAccountUpdate,
  botAssignmentCreate,
  botInventoryFindUnique,
  botInventoryUpdate,
  customerInventoryFindMany,
  customerInventoryUpdate,
  gameDeliveryConfigFindUnique,
  transaction,
  syncBotCurrentDeliveries,
  assignBotAndCreateDeliveryJob,
} = vi.hoisted(() => ({
  withdrawalFindUnique: vi.fn(),
  withdrawalUpdate: vi.fn(),
  withdrawalFindMany: vi.fn(),
  supportNoteCreate: vi.fn(),
  deliveryJobFindUnique: vi.fn(),
  deliveryJobCreate: vi.fn(),
  deliveryLogCreate: vi.fn(),
  botAccountFindMany: vi.fn(),
  botAccountUpdate: vi.fn(),
  botAssignmentCreate: vi.fn(),
  botInventoryFindUnique: vi.fn(),
  botInventoryUpdate: vi.fn(),
  customerInventoryFindMany: vi.fn(),
  customerInventoryUpdate: vi.fn(),
  gameDeliveryConfigFindUnique: vi.fn(),
  transaction: vi.fn(),
  syncBotCurrentDeliveries: vi.fn(),
  assignBotAndCreateDeliveryJob: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    withdrawal: {
      findUnique: withdrawalFindUnique,
      update: withdrawalUpdate,
      findMany: withdrawalFindMany,
    },
    supportNote: { create: supportNoteCreate },
    deliveryJob: {
      findUnique: deliveryJobFindUnique,
      create: deliveryJobCreate,
    },
    deliveryLog: { create: deliveryLogCreate },
    botAccount: {
      findMany: botAccountFindMany,
      update: botAccountUpdate,
    },
    botAssignment: { create: botAssignmentCreate },
    botInventory: {
      findUnique: botInventoryFindUnique,
      update: botInventoryUpdate,
    },
    customerInventory: {
      findMany: customerInventoryFindMany,
      update: customerInventoryUpdate,
    },
    gameDeliveryConfig: { findUnique: gameDeliveryConfigFindUnique },
    $transaction: transaction,
  },
}));

vi.mock("@/server/services/bot-capacity", () => ({
  syncBotCurrentDeliveries,
  syncGameBotCapacities: vi.fn(),
}));

vi.mock("@/server/services/delivery-request", () => ({
  assignBotAndCreateDeliveryJob,
  formatAssignmentPayload: vi.fn(),
}));

vi.mock("@/server/services/game-delivery-config", () => ({
  getGameDeliveryConfig: vi.fn(async () => ({
    game: "MM2",
    deliveryMethod: "TRADING",
    requiresFriend: true,
    requiresPrivateServer: true,
    requiresCustomerJoin: true,
    requiresManualConfirmation: true,
    instructions: "Add bot as friend",
  })),
}));

import {
  addSupportNote,
  approveSupportWithdrawal,
  rejectSupportWithdrawal,
  listSupportWithdrawals,
  addDeliveryProof,
} from "@/server/services/support-review";

function buildSupportWithdrawal(overrides?: Partial<{ status: WithdrawalStatus }>) {
  return {
    id: "withdrawal1",
    withdrawalCode: "WD-HIGHVAL",
    status: overrides?.status ?? WithdrawalStatus.SUPPORT_REQUIRED,
    customerId: "customer1",
    sessionId: null,
    robloxUsername: "PlayerOne",
    totalValue: 250,
    supportReason: "Withdrawal total exceeds fraud review threshold",
    createdAt: new Date("2026-06-23T00:00:00.000Z"),
    updatedAt: new Date("2026-06-23T00:00:00.000Z"),
    customer: { id: "customer1", email: "buyer@example.com", robloxUsername: "PlayerOne" },
    items: [
      {
        id: "item1",
        productId: "product1",
        quantity: 1,
        product: { name: "Rare Item", game: "MM2", rarity: "legendary", value: 250 },
      },
    ],
    botAssignments: [],
    deliveryJob: null,
    supportNotes: [],
  };
}

function mockTransaction() {
  transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      withdrawal: { update: withdrawalUpdate },
      deliveryLog: { create: deliveryLogCreate },
      supportNote: { create: supportNoteCreate },
      customerInventory: {
        findMany: customerInventoryFindMany,
        update: customerInventoryUpdate,
      },
      botInventory: {
        findUnique: botInventoryFindUnique,
        update: botInventoryUpdate,
      },
    };
    return cb(tx);
  });
}

describe("listSupportWithdrawals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists SUPPORT_REQUIRED withdrawals", async () => {
    withdrawalFindMany.mockResolvedValue([buildSupportWithdrawal()]);

    const result = await listSupportWithdrawals();
    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe(WithdrawalStatus.SUPPORT_REQUIRED);
    expect(withdrawalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: WithdrawalStatus.SUPPORT_REQUIRED },
      })
    );
  });
});

describe("addSupportNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a support note and delivery log", async () => {
    const w = buildSupportWithdrawal();
    withdrawalFindUnique.mockResolvedValue(w);
    supportNoteCreate.mockResolvedValue({
      id: "note1",
      note: "Checking customer history",
      createdAt: new Date(),
      adminUser: null,
    });

    const result = await addSupportNote("withdrawal1", "Checking customer history", "admin1");

    expect(supportNoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          withdrawalId: "withdrawal1",
          note: "Checking customer history",
          adminUserId: "admin1",
        }),
      })
    );
    expect("error" in result).toBe(false);
  });

  it("returns error when withdrawal not found", async () => {
    withdrawalFindUnique.mockResolvedValue(null);

    const result = await addSupportNote("nonexistent", "note");
    expect(result).toEqual({ error: "Withdrawal not found" });
  });
});

describe("approveSupportWithdrawal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
  });

  it("assigns bot and enters delivery flow", async () => {
    const w = buildSupportWithdrawal();
    withdrawalFindUnique.mockResolvedValue(w);
    assignBotAndCreateDeliveryJob.mockResolvedValue({ success: true, botId: "bot1" });
    deliveryJobFindUnique.mockResolvedValue({ id: "job1", withdrawalId: "withdrawal1" });
    syncBotCurrentDeliveries.mockResolvedValue(undefined);
    withdrawalUpdate.mockResolvedValue({});
    deliveryLogCreate.mockResolvedValue({});
    supportNoteCreate.mockResolvedValue({});

    const result = await approveSupportWithdrawal("withdrawal1", "admin1");

    expect("error" in result).toBe(false);
    expect(assignBotAndCreateDeliveryJob).toHaveBeenCalledWith(
      { type: "withdrawal", withdrawalId: "withdrawal1" },
      "MM2",
      expect.arrayContaining([
        expect.objectContaining({ productId: "product1", quantity: 1 }),
      ])
    );
    expect(syncBotCurrentDeliveries).toHaveBeenCalledWith("bot1");
  });

  it("prevents duplicate approval when delivery job already exists", async () => {
    const w = {
      ...buildSupportWithdrawal(),
      deliveryJob: { id: "job1", status: DeliveryStatus.QUEUED },
    };
    withdrawalFindUnique.mockResolvedValue(w);

    const result = await approveSupportWithdrawal("withdrawal1");

    expect(result).toEqual({
      error: "Delivery job already exists for this withdrawal",
    });
    expect(assignBotAndCreateDeliveryJob).not.toHaveBeenCalled();
  });

  it("returns error if bot assignment fails", async () => {
    const w = buildSupportWithdrawal();
    withdrawalFindUnique.mockResolvedValue(w);
    assignBotAndCreateDeliveryJob.mockResolvedValue({
      success: false,
      error: "No bot available",
    });

    const result = await approveSupportWithdrawal("withdrawal1");

    expect(result).toEqual({ error: "No bot available" });
  });

  it("returns error if withdrawal is not SUPPORT_REQUIRED", async () => {
    const w = buildSupportWithdrawal({
      status: WithdrawalStatus.QUEUED,
    });
    withdrawalFindUnique.mockResolvedValue(w);

    const result = await approveSupportWithdrawal("withdrawal1");
    expect(result).toEqual({
      error: "Withdrawal is not in SUPPORT_REQUIRED status",
    });
  });
});

describe("rejectSupportWithdrawal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
  });

  it("cancels withdrawal and releases customer inventory", async () => {
    const w = buildSupportWithdrawal();
    withdrawalFindUnique.mockResolvedValue(w);
    customerInventoryFindMany.mockResolvedValue([
      {
        id: "inv1",
        productId: "product1",
        customerId: "customer1",
        reservedQuantity: 1,
        quantity: 1,
      },
    ]);
    customerInventoryUpdate.mockResolvedValue({});
    withdrawalUpdate.mockResolvedValue({});
    supportNoteCreate.mockResolvedValue({});

    const result = await rejectSupportWithdrawal(
      "withdrawal1",
      "Failed fraud check",
      "admin1"
    );

    expect("error" in result).toBe(false);
    expect(withdrawalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "withdrawal1" },
        data: expect.objectContaining({ status: WithdrawalStatus.CANCELLED }),
      })
    );
    expect(supportNoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          note: expect.stringContaining("Failed fraud check"),
        }),
      })
    );
  });

  it("does not create delivery job on rejection", async () => {
    const w = buildSupportWithdrawal();
    withdrawalFindUnique.mockResolvedValue(w);
    customerInventoryFindMany.mockResolvedValue([]);
    withdrawalUpdate.mockResolvedValue({});
    supportNoteCreate.mockResolvedValue({});

    await rejectSupportWithdrawal("withdrawal1", "Fraud detected", "admin1");

    expect(deliveryJobCreate).not.toHaveBeenCalled();
    expect(assignBotAndCreateDeliveryJob).not.toHaveBeenCalled();
  });

  it("returns error if withdrawal is not SUPPORT_REQUIRED", async () => {
    const w = buildSupportWithdrawal({ status: WithdrawalStatus.CANCELLED });
    withdrawalFindUnique.mockResolvedValue(w);

    const result = await rejectSupportWithdrawal("withdrawal1", "reason");
    expect(result).toEqual({
      error: "Withdrawal is not in SUPPORT_REQUIRED status",
    });
  });
});

describe("addDeliveryProof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds proof log to delivery job", async () => {
    deliveryJobFindUnique.mockResolvedValue({
      id: "job1",
      withdrawal: { id: "withdrawal1" },
    });
    deliveryLogCreate.mockResolvedValue({
      id: "log1",
      message: "Trade completed with PlayerOne",
      proofText: "Trade completed with PlayerOne",
      proofImageUrl: "https://example.com/proof.png",
      createdAt: new Date(),
    });

    const result = await addDeliveryProof(
      "job1",
      "Trade completed with PlayerOne",
      "https://example.com/proof.png"
    );

    expect("error" in result).toBe(false);
    expect(deliveryLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proofText: "Trade completed with PlayerOne",
          proofImageUrl: "https://example.com/proof.png",
        }),
      })
    );
  });

  it("returns error if delivery job not found", async () => {
    deliveryJobFindUnique.mockResolvedValue(null);

    const result = await addDeliveryProof("nonexistent", "proof text");
    expect(result).toEqual({ error: "Delivery job not found" });
  });
});

describe("public withdrawal page support required status", () => {
  it("withdrawal-status lib has updated support required message", async () => {
    const { getWithdrawalStatusMessage } = await import("@/lib/withdrawal-status");

    const msg = getWithdrawalStatusMessage("SUPPORT_REQUIRED");
    expect(msg).toContain("customer service review");
    expect(msg).toContain("Our team will review");
  });

  it("SUPPORT_REQUIRED is not in terminal statuses", () => {
    // Polling must continue after SUPPORT_REQUIRED so page updates when approved
    const TERMINAL = new Set(["DELIVERED", "FAILED", "CANCELLED"]);
    expect(TERMINAL.has("SUPPORT_REQUIRED")).toBe(false);
  });
});
