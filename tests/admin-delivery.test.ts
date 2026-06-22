import { beforeEach, describe, expect, it, vi } from "vitest";
import { BotAssignmentStatus, DeliveryStatus, WithdrawalStatus } from "@prisma/client";

const {
  deliveryJobFindUnique,
  botInventoryFindMany,
  transaction,
  syncBotCurrentDeliveries,
} = vi.hoisted(() => ({
  deliveryJobFindUnique: vi.fn(),
  botInventoryFindMany: vi.fn(),
  transaction: vi.fn(),
  syncBotCurrentDeliveries: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    deliveryJob: {
      findUnique: deliveryJobFindUnique,
    },
    botInventory: {
      findMany: botInventoryFindMany,
    },
    $transaction: transaction,
  },
}));

vi.mock("@/server/services/bot-capacity", () => ({
  syncBotCurrentDeliveries,
}));

vi.mock("@/server/services/game-delivery-config", () => ({
  getGameDeliveryConfig: vi.fn(async () => ({
    game: "MM2",
    deliveryMethod: "TRADING",
    requiresFriend: true,
    requiresPrivateServer: true,
    requiresCustomerJoin: true,
    requiresManualConfirmation: true,
    instructions: "Step 1: Add bot",
  })),
}));

import {
  computeInventoryDeduction,
  getOperatorInstructions,
  markDeliveryJobDelivered,
  markDeliveryJobFailed,
  resolveRetryAssignmentStatus,
  retryFailedDeliveryJob,
  verifyReservedInventory,
} from "@/server/services/admin-delivery";

function buildJob(overrides?: Partial<{
  jobStatus: DeliveryStatus;
  withdrawalStatus: WithdrawalStatus;
  assignmentStatus: BotAssignmentStatus;
}>) {
  return {
    id: "job1",
    status: overrides?.jobStatus ?? DeliveryStatus.QUEUED,
    attempts: 1,
    lastError: null,
    deliveredAt: null,
    createdAt: new Date("2026-06-22T12:00:00.000Z"),
    updatedAt: new Date("2026-06-22T12:00:00.000Z"),
    claimId: null,
    withdrawalId: "withdrawal1",
    lockedAt: null,
    logs: [],
    withdrawal: {
      id: "withdrawal1",
      withdrawalCode: "WD-TEST123",
      status: overrides?.withdrawalStatus ?? WithdrawalStatus.QUEUED,
      robloxUsername: "TestPlayer",
      items: [
        {
          id: "item1",
          productId: "product1",
          quantity: 2,
          product: {
            id: "product1",
            name: "$10 Voucher",
            game: "MM2",
            rarity: "rare",
          },
        },
      ],
      botAssignments: [
        {
          id: "assignment1",
          status: overrides?.assignmentStatus ?? BotAssignmentStatus.IN_GAME,
          botAccountId: "bot1",
          botAccount: {
            id: "bot1",
            robloxUsername: "radiomirrorq",
            profileUrl: "https://example.com/bot",
            privateServerUrl: null,
          },
        },
      ],
    },
    claim: null,
  };
}

describe("admin delivery helpers", () => {
  it("validates reserved inventory", () => {
    expect(
      verifyReservedInventory(
        [{ productId: "product1", quantity: 5, reservedQuantity: 2 }],
        [{ productId: "product1", quantity: 2 }]
      ).ok
    ).toBe(true);

    expect(
      verifyReservedInventory(
        [{ productId: "product1", quantity: 5, reservedQuantity: 1 }],
        [{ productId: "product1", quantity: 2 }]
      ).ok
    ).toBe(false);
  });

  it("computes inventory deduction without negative reserved", () => {
    expect(computeInventoryDeduction(10, 2, 2)).toEqual({
      nextQuantity: 8,
      nextReserved: 0,
    });
  });

  it("returns trading and mailbox operator instructions", () => {
    expect(getOperatorInstructions("TRADING")[0]).toContain("Login");
    expect(getOperatorInstructions("MAILBOX")[1]).toContain("mailbox");
  });

  it("resolves retry assignment status from game config", () => {
    expect(
      resolveRetryAssignmentStatus({
        requiresFriend: true,
        requiresCustomerJoin: true,
      })
    ).toBe(BotAssignmentStatus.READY_TO_JOIN);

    expect(
      resolveRetryAssignmentStatus({
        requiresFriend: false,
        requiresCustomerJoin: false,
      })
    ).toBe(BotAssignmentStatus.ASSIGNED);
  });
});

describe("markDeliveryJobDelivered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks withdrawal delivered and deducts inventory once", async () => {
    const job = buildJob();
    deliveryJobFindUnique
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce({
        ...job,
        status: DeliveryStatus.DELIVERED,
        logs: [{ id: "log1", level: "INFO", message: "Admin marked delivery completed.", createdAt: new Date() }],
      });

    botInventoryFindMany.mockResolvedValue([
      {
        id: "inv1",
        productId: "product1",
        quantity: 10,
        reservedQuantity: 2,
      },
    ]);

    const tx = {
      deliveryJob: {
        findUnique: vi.fn().mockResolvedValue({ id: "job1", status: DeliveryStatus.QUEUED }),
        update: vi.fn(),
      },
      botInventory: {
        findUnique: vi.fn().mockResolvedValue({
          id: "inv1",
          productId: "product1",
          quantity: 10,
          reservedQuantity: 2,
        }),
        update: vi.fn(),
      },
      inventoryLog: { create: vi.fn() },
      withdrawal: { update: vi.fn() },
      botAssignment: { update: vi.fn() },
      deliveryLog: { create: vi.fn() },
      botAccount: {
        findUnique: vi.fn().mockResolvedValue({ id: "bot1", currentDeliveries: 1 }),
        update: vi.fn(),
      },
      // customer inventory deduction (added in audit fix)
      customerInventory: {
        findFirst: vi.fn().mockResolvedValue({
          id: "ci1",
          productId: "product1",
          quantity: 2,
          reservedQuantity: 2,
        }),
        update: vi.fn(),
      },
      customerInventoryLog: { create: vi.fn() },
    };

    transaction.mockImplementation(async (callback) => callback(tx));

    const result = await markDeliveryJobDelivered("job1");
    expect(result).not.toHaveProperty("error");
    expect(tx.withdrawal.update).toHaveBeenCalledWith({
      where: { id: "withdrawal1" },
      data: { status: WithdrawalStatus.DELIVERED },
    });
    expect(tx.botInventory.update).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { quantity: 8, reservedQuantity: 0 },
    });
    expect(tx.inventoryLog.create).toHaveBeenCalledTimes(1);
    expect(tx.deliveryLog.create).toHaveBeenCalledTimes(1);
    expect(syncBotCurrentDeliveries).toHaveBeenCalledWith("bot1");
    // verify customer inventory was deducted
    expect(tx.customerInventory.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 0, reservedQuantity: 0 }) })
    );
    expect(tx.customerInventoryLog.create).toHaveBeenCalledTimes(1);
  });

  it("does not deduct inventory twice when already delivered", async () => {
    const deliveredJob = buildJob({
      jobStatus: DeliveryStatus.DELIVERED,
      withdrawalStatus: WithdrawalStatus.DELIVERED,
      assignmentStatus: BotAssignmentStatus.COMPLETED,
    });

    deliveryJobFindUnique.mockResolvedValueOnce(deliveredJob);
    const result = await markDeliveryJobDelivered("job1");

    expect(result).not.toHaveProperty("error");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("markDeliveryJobFailed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("releases reserved inventory and creates delivery log", async () => {
    const job = buildJob({ jobStatus: DeliveryStatus.QUEUED });
    deliveryJobFindUnique
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce({
        ...job,
        status: DeliveryStatus.FAILED,
        logs: [{ id: "log1", level: "WARN", message: "Delivery marked failed: Trade timeout", createdAt: new Date() }],
      });

    const tx = {
      deliveryJob: {
        findUnique: vi.fn().mockResolvedValue({ id: "job1", status: DeliveryStatus.QUEUED }),
        update: vi.fn(),
      },
      botInventory: {
        findUnique: vi.fn().mockResolvedValue({
          id: "inv1",
          productId: "product1",
          quantity: 10,
          reservedQuantity: 2,
        }),
        update: vi.fn(),
      },
      withdrawal: { update: vi.fn() },
      botAssignment: { update: vi.fn() },
      deliveryLog: { create: vi.fn() },
      botAccount: {
        findUnique: vi.fn().mockResolvedValue({ id: "bot1", currentDeliveries: 1 }),
        update: vi.fn(),
      },
    };

    transaction.mockImplementation(async (callback) => callback(tx));

    const result = await markDeliveryJobFailed("job1", "Trade timeout");
    expect(result).not.toHaveProperty("error");
    expect(tx.botInventory.update).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { reservedQuantity: 0 },
    });
    expect(tx.deliveryLog.create).toHaveBeenCalled();
  });

  it("cannot mark failed after delivered", async () => {
    const job = buildJob({
      jobStatus: DeliveryStatus.DELIVERED,
      withdrawalStatus: WithdrawalStatus.DELIVERED,
    });
    deliveryJobFindUnique.mockResolvedValueOnce(job);

    const result = await markDeliveryJobFailed("job1", "Too late");
    expect(result).toEqual({
      error: "Cannot mark failed after delivery is completed",
    });
  });
});

describe("retryFailedDeliveryJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requeues failed delivery and reserves inventory again", async () => {
    const job = buildJob({
      jobStatus: DeliveryStatus.FAILED,
      withdrawalStatus: WithdrawalStatus.FAILED,
      assignmentStatus: BotAssignmentStatus.FAILED,
    });

    deliveryJobFindUnique
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce({
        ...job,
        status: DeliveryStatus.QUEUED,
        logs: [{ id: "log1", level: "INFO", message: "Delivery retry was queued by admin.", createdAt: new Date() }],
      });

    botInventoryFindMany.mockResolvedValue([
      {
        id: "inv1",
        productId: "product1",
        quantity: 10,
        reservedQuantity: 0,
      },
    ]);

    const tx = {
      deliveryJob: {
        findUnique: vi.fn().mockResolvedValue({ id: "job1", status: DeliveryStatus.FAILED }),
        update: vi.fn(),
      },
      botInventory: {
        findUnique: vi.fn().mockResolvedValue({
          id: "inv1",
          productId: "product1",
          quantity: 10,
          reservedQuantity: 0,
        }),
        update: vi.fn(),
      },
      withdrawal: { update: vi.fn() },
      botAssignment: { update: vi.fn() },
      deliveryLog: { create: vi.fn() },
      botAccount: { update: vi.fn() },
    };

    transaction.mockImplementation(async (callback) => callback(tx));

    const result = await retryFailedDeliveryJob("job1");
    expect(result).not.toHaveProperty("error");
    expect(tx.deliveryJob.update).toHaveBeenCalledWith({
      where: { id: "job1" },
      data: {
        status: DeliveryStatus.QUEUED,
        lastError: null,
        lockedAt: null,
      },
    });
    expect(tx.botInventory.update).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { reservedQuantity: { increment: 2 } },
    });
    expect(tx.deliveryLog.create).toHaveBeenCalled();
  });
});
