import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BotAssignmentStatus,
  BotStatus,
  DeliveryStatus,
  WithdrawalStatus,
} from "@prisma/client";

const {
  botAccountFindMany,
  botAccountFindUnique,
  botAccountUpdate,
  botInventoryFindUnique,
  botInventoryUpdate,
  botAssignmentCreate,
  botAssignmentUpdate,
  botAssignmentFindFirst,
  deliveryJobFindUnique,
  deliveryJobFindMany,
  deliveryJobUpdate,
  deliveryJobCount,
  deliveryLogCreate,
  withdrawalFindUnique,
  withdrawalFindMany,
  withdrawalUpdate,
  withdrawalFindFirst,
  gameConfigFindUnique,
  transaction,
  syncBotCurrentDeliveries,
} = vi.hoisted(() => ({
  botAccountFindMany: vi.fn(),
  botAccountFindUnique: vi.fn(),
  botAccountUpdate: vi.fn(),
  botInventoryFindUnique: vi.fn(),
  botInventoryUpdate: vi.fn(),
  botAssignmentCreate: vi.fn(),
  botAssignmentUpdate: vi.fn(),
  botAssignmentFindFirst: vi.fn(),
  deliveryJobFindUnique: vi.fn(),
  deliveryJobFindMany: vi.fn(),
  deliveryJobUpdate: vi.fn(),
  deliveryJobCount: vi.fn(),
  deliveryLogCreate: vi.fn(),
  withdrawalFindUnique: vi.fn(),
  withdrawalFindMany: vi.fn(),
  withdrawalUpdate: vi.fn(),
  withdrawalFindFirst: vi.fn(),
  gameConfigFindUnique: vi.fn(),
  transaction: vi.fn(),
  syncBotCurrentDeliveries: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    botAccount: {
      findMany: botAccountFindMany,
      findUnique: botAccountFindUnique,
      update: botAccountUpdate,
      count: vi.fn(),
    },
    botInventory: {
      findUnique: botInventoryFindUnique,
      update: botInventoryUpdate,
    },
    botAssignment: {
      create: botAssignmentCreate,
      update: botAssignmentUpdate,
      findFirst: botAssignmentFindFirst,
      count: vi.fn(),
    },
    deliveryJob: {
      findUnique: deliveryJobFindUnique,
      findMany: deliveryJobFindMany,
      update: deliveryJobUpdate,
      count: deliveryJobCount,
    },
    deliveryLog: { create: deliveryLogCreate },
    withdrawal: {
      findUnique: withdrawalFindUnique,
      findMany: withdrawalFindMany,
      update: withdrawalUpdate,
      findFirst: withdrawalFindFirst,
      count: vi.fn(),
    },
    gameDeliveryConfig: { findUnique: gameConfigFindUnique },
    $transaction: transaction,
  },
}));

vi.mock("@/server/services/bot-capacity", () => ({
  syncBotCurrentDeliveries,
  syncGameBotCapacities: vi.fn(),
}));

vi.mock("@/server/services/game-delivery-config", () => ({
  getGameDeliveryConfig: gameConfigFindUnique,
}));

import {
  botHasSufficientInventory,
  selectEligibleBot,
} from "@/server/services/delivery-request";
import { getWithdrawalQueueInfo } from "@/server/services/queue-estimate";
import {
  expireSingleWithdrawal,
  expireWaitingWithdrawals,
  markDeliveryJobRetryLater,
  reassignDeliveryJob,
} from "@/server/services/admin-delivery";

function buildBot(overrides?: Partial<{
  id: string;
  status: BotStatus;
  currentDeliveries: number;
  maxConcurrentDeliveries: number;
  inventoryQty: number;
  inventoryReserved: number;
}>) {
  return {
    id: overrides?.id ?? "bot1",
    robloxUsername: "Bot1",
    status: overrides?.status ?? BotStatus.ONLINE,
    currentDeliveries: overrides?.currentDeliveries ?? 0,
    maxConcurrentDeliveries: overrides?.maxConcurrentDeliveries ?? 2,
    profileUrl: "https://roblox.com/bot1",
    privateServerUrl: null,
    inventories: [
      {
        productId: "product1",
        quantity: overrides?.inventoryQty ?? 5,
        reservedQuantity: overrides?.inventoryReserved ?? 0,
      },
    ],
  };
}

function buildDeliveryJob(overrides?: Partial<{
  status: DeliveryStatus;
  withdrawalStatus: WithdrawalStatus;
}>) {
  return {
    id: "job1",
    status: overrides?.status ?? DeliveryStatus.WAITING_USER,
    attempts: 1,
    lastError: null,
    nextRetryAt: null,
    retryReason: null,
    deliveredAt: null,
    lockedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    claimId: null,
    withdrawalId: "withdrawal1",
    logs: [],
    withdrawal: {
      id: "withdrawal1",
      withdrawalCode: "WD-TEST123",
      status: overrides?.withdrawalStatus ?? WithdrawalStatus.WAITING_FRIEND_REQUEST,
      robloxUsername: "TestPlayer",
      items: [
        {
          id: "wi1",
          productId: "product1",
          quantity: 2,
          product: { name: "Test Item", game: "MM2", rarity: null, value: 10 },
        },
      ],
      botAssignments: [
        {
          id: "assignment1",
          status: BotAssignmentStatus.FRIEND_REQUEST_PENDING,
          botAccountId: "bot1",
          assignedAt: new Date(),
          botAccount: {
            id: "bot1",
            robloxUsername: "OldBot",
            profileUrl: "https://roblox.com/oldbot",
            privateServerUrl: null,
          },
        },
      ],
    },
    claim: null,
  };
}

function mockTransaction() {
  transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      deliveryJob: { update: deliveryJobUpdate, findUnique: deliveryJobFindUnique },
      withdrawal: { update: withdrawalUpdate },
      botAssignment: { update: botAssignmentUpdate, create: botAssignmentCreate },
      botInventory: { findUnique: botInventoryFindUnique, update: botInventoryUpdate },
      botAccount: { findUnique: botAccountFindUnique, update: botAccountUpdate },
      deliveryLog: { create: deliveryLogCreate },
    };
    return fn(tx);
  });
}

describe("bot concurrency", () => {
  it("only selects ONLINE bots under their max concurrency", () => {
    const bots = [
      buildBot({ status: BotStatus.OFFLINE }),
      buildBot({ id: "bot2", status: BotStatus.ONLINE, currentDeliveries: 0, maxConcurrentDeliveries: 1 }),
      buildBot({ id: "bot3", status: BotStatus.ONLINE, currentDeliveries: 1, maxConcurrentDeliveries: 1 }),
    ];

    const selected = selectEligibleBot(bots, [{ productId: "product1", quantity: 1 }]);
    expect(selected?.id).toBe("bot2");
  });

  it("offline bot is not assigned", () => {
    const bots = [buildBot({ status: BotStatus.OFFLINE })];
    const selected = selectEligibleBot(bots, [{ productId: "product1", quantity: 1 }]);
    expect(selected).toBeNull();
  });

  it("disabled bot is not assigned", () => {
    const bots = [buildBot({ status: BotStatus.DISABLED as BotStatus })];
    const selected = selectEligibleBot(bots, [{ productId: "product1", quantity: 1 }]);
    expect(selected).toBeNull();
  });

  it("at-capacity bot is not assigned even if ONLINE", () => {
    const bots = [buildBot({ status: BotStatus.ONLINE, currentDeliveries: 2, maxConcurrentDeliveries: 2 })];
    const selected = selectEligibleBot(bots, [{ productId: "product1", quantity: 1 }]);
    expect(selected).toBeNull();
  });

  it("bot with insufficient inventory is not assigned", () => {
    const bots = [buildBot({ inventoryQty: 1, inventoryReserved: 1 })];
    const hasSufficient = botHasSufficientInventory(bots[0]!.inventories, [
      { productId: "product1", quantity: 2 },
    ]);
    expect(hasSufficient).toBe(false);
  });
});

describe("queue position and estimated wait", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns queue position and EWT for an active withdrawal", async () => {
    withdrawalFindUnique.mockResolvedValue({
      id: "w1",
      status: WithdrawalStatus.QUEUED,
      createdAt: new Date("2026-06-23T02:00:00Z"),
    });

    deliveryJobCount.mockResolvedValue(3);

    gameConfigFindUnique.mockResolvedValue({
      game: "MM2",
      averageDeliveryMinutes: 5,
    });

    const result = await getWithdrawalQueueInfo("w1", "MM2");

    expect(result.queuePosition).toBe(4);
    expect(result.estimatedWaitMinutes).toBe(15);
  });

  it("returns zeros for a non-queued withdrawal", async () => {
    withdrawalFindUnique.mockResolvedValue({
      id: "w1",
      status: WithdrawalStatus.DELIVERED,
      createdAt: new Date(),
    });

    const result = await getWithdrawalQueueInfo("w1", "MM2");

    expect(result.queuePosition).toBe(0);
    expect(result.estimatedWaitMinutes).toBe(0);
    expect(deliveryJobCount).not.toHaveBeenCalled();
  });
});

describe("retry later", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
  });

  it("sets nextRetryAt and status RETRYING", async () => {
    deliveryJobFindUnique.mockResolvedValue(buildDeliveryJob({ status: DeliveryStatus.WAITING_USER }));
    deliveryJobUpdate.mockResolvedValue({});
    withdrawalUpdate.mockResolvedValue({});
    deliveryLogCreate.mockResolvedValue({});

    const result = await markDeliveryJobRetryLater("job1", "Bot was busy", 15);

    expect(deliveryJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job1" },
        data: expect.objectContaining({
          status: DeliveryStatus.RETRYING,
          retryReason: "Bot was busy",
        }),
      })
    );

    const updateCall = deliveryJobUpdate.mock.calls[0]?.[0] as { data: { nextRetryAt: Date } };
    expect(updateCall?.data?.nextRetryAt).toBeInstanceOf(Date);
    expect("error" in result).toBe(false);
  });
});

describe("reassign delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
  });

  it("releases old bot inventory and reserves new bot inventory", async () => {
    deliveryJobFindUnique.mockResolvedValue(buildDeliveryJob());

    botAccountFindMany.mockResolvedValue([
      {
        id: "bot2",
        robloxUsername: "NewBot",
        status: BotStatus.ONLINE,
        currentDeliveries: 0,
        maxConcurrentDeliveries: 2,
        inventories: [
          { id: "inv2", productId: "product1", quantity: 5, reservedQuantity: 0 },
        ],
      },
    ]);

    botInventoryFindUnique
      .mockResolvedValueOnce({ id: "inv1", reservedQuantity: 2 })
      .mockResolvedValueOnce({ id: "inv2", quantity: 5, reservedQuantity: 0 });

    botInventoryUpdate.mockResolvedValue({});
    botAssignmentUpdate.mockResolvedValue({});
    botAssignmentCreate.mockResolvedValue({});
    botAccountFindUnique.mockResolvedValue({ id: "bot1", currentDeliveries: 1 });
    botAccountUpdate.mockResolvedValue({});
    deliveryLogCreate.mockResolvedValue({});
    syncBotCurrentDeliveries.mockResolvedValue(0);

    const result = await reassignDeliveryJob("job1");

    expect(botInventoryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reservedQuantity: 0 }),
      })
    );
    expect(botInventoryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reservedQuantity: { increment: 2 } }),
      })
    );
    expect("error" in result).toBe(false);
  });

  it("returns error when no available bot exists", async () => {
    deliveryJobFindUnique.mockResolvedValue(buildDeliveryJob());
    botAccountFindMany.mockResolvedValue([]);

    const result = await reassignDeliveryJob("job1");

    expect(result).toEqual({ error: "No available bot with enough inventory" });
  });
});

describe("expire waiting withdrawals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
  });

  it("expires WAITING_FRIEND_REQUEST withdrawal and releases bot inventory", async () => {
    const oldDate = new Date(Date.now() - 40 * 60 * 1000);
    withdrawalFindMany.mockResolvedValue([
      {
        id: "w1",
        withdrawalCode: "WD-OLD",
        status: WithdrawalStatus.WAITING_FRIEND_REQUEST,
        createdAt: oldDate,
        items: [{ id: "wi1", productId: "product1", quantity: 2 }],
        deliveryJob: { id: "job1", status: DeliveryStatus.WAITING_USER },
        botAssignments: [
          { id: "assignment1", botAccountId: "bot1", status: BotAssignmentStatus.FRIEND_REQUEST_PENDING },
        ],
      },
    ]);

    botInventoryFindUnique.mockResolvedValue({ id: "inv1", reservedQuantity: 2 });
    botInventoryUpdate.mockResolvedValue({});
    botAssignmentUpdate.mockResolvedValue({});
    deliveryJobUpdate.mockResolvedValue({});
    withdrawalUpdate.mockResolvedValue({});
    botAccountFindUnique.mockResolvedValue({ id: "bot1", currentDeliveries: 1 });
    botAccountUpdate.mockResolvedValue({});
    deliveryLogCreate.mockResolvedValue({});
    syncBotCurrentDeliveries.mockResolvedValue(0);

    const { expiredCount } = await expireWaitingWithdrawals(30);

    expect(expiredCount).toBe(1);
    expect(withdrawalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "w1" },
        data: { status: WithdrawalStatus.EXPIRED },
      })
    );
    expect(deliveryJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: DeliveryStatus.CANCELLED }),
      })
    );
    expect(botInventoryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { reservedQuantity: 0 } })
    );
  });

  it("expireSingleWithdrawal cancels delivery job and releases inventory", async () => {
    deliveryJobFindUnique.mockResolvedValue(
      buildDeliveryJob({ status: DeliveryStatus.WAITING_USER, withdrawalStatus: WithdrawalStatus.WAITING_FRIEND_REQUEST })
    );

    botInventoryFindUnique.mockResolvedValue({ id: "inv1", reservedQuantity: 2 });
    botInventoryUpdate.mockResolvedValue({});
    botAssignmentUpdate.mockResolvedValue({});
    deliveryJobUpdate.mockResolvedValue({});
    withdrawalUpdate.mockResolvedValue({});
    botAccountFindUnique.mockResolvedValue({ id: "bot1", currentDeliveries: 1 });
    botAccountUpdate.mockResolvedValue({});
    deliveryLogCreate.mockResolvedValue({});
    syncBotCurrentDeliveries.mockResolvedValue(0);

    const result = await expireSingleWithdrawal("job1");

    expect(withdrawalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: WithdrawalStatus.EXPIRED } })
    );
    expect(deliveryJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DeliveryStatus.CANCELLED }) })
    );
    expect("error" in result).toBe(false);
  });
});
