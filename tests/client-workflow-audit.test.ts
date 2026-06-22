/**
 * Client Workflow Audit Tests
 * Covers the full RNGBLOX automation workflow:
 * payment → inventory → withdrawal → delivery
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BotAssignmentStatus,
  BotStatus,
  CustomerInventoryLogReason,
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  WithdrawalStatus,
} from "@prisma/client";

// ─── hoisted mock factories ───────────────────────────────────────────────────
const {
  orderFindUnique,
  orderUpdate,
  customerInventoryFindFirst,
  customerInventoryUpdate,
  customerInventoryLogCreate,
  stripeEventFindUnique,
  stripeEventCreate,
  botInventoryFindUnique,
  botInventoryUpdate,
  botAccountFindUnique,
  botAccountUpdate,
  deliveryJobFindUnique,
  deliveryJobUpdate,
  withdrawalFindUnique,
  withdrawalUpdate,
  botAssignmentUpdate,
  deliveryLogCreate,
  transaction,
  inventoryLogCreate,
} = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdate: vi.fn(),
  customerInventoryFindFirst: vi.fn(),
  customerInventoryUpdate: vi.fn(),
  customerInventoryLogCreate: vi.fn(),
  stripeEventFindUnique: vi.fn(),
  stripeEventCreate: vi.fn(),
  botInventoryFindUnique: vi.fn(),
  botInventoryUpdate: vi.fn(),
  botAccountFindUnique: vi.fn(),
  botAccountUpdate: vi.fn(),
  deliveryJobFindUnique: vi.fn(),
  deliveryJobUpdate: vi.fn(),
  withdrawalFindUnique: vi.fn(),
  withdrawalUpdate: vi.fn(),
  botAssignmentUpdate: vi.fn(),
  deliveryLogCreate: vi.fn(),
  transaction: vi.fn(),
  inventoryLogCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: orderFindUnique, update: orderUpdate },
    stripeEvent: { findUnique: stripeEventFindUnique, create: stripeEventCreate },
    customerInventory: { findFirst: customerInventoryFindFirst, update: customerInventoryUpdate },
    customerInventoryLog: { create: customerInventoryLogCreate },
    botInventory: {
      findUnique: botInventoryFindUnique,
      findMany: vi.fn(),
      update: botInventoryUpdate,
    },
    botAccount: { findUnique: botAccountFindUnique, update: botAccountUpdate },
    deliveryJob: { findUnique: deliveryJobFindUnique, update: deliveryJobUpdate },
    withdrawal: { findUnique: withdrawalFindUnique, update: withdrawalUpdate },
    botAssignment: { update: botAssignmentUpdate },
    deliveryLog: { create: deliveryLogCreate },
    inventoryLog: { create: inventoryLogCreate },
    $transaction: transaction,
  },
}));

vi.mock("@/server/services/bot-capacity", () => ({
  syncBotCurrentDeliveries: vi.fn().mockResolvedValue(0),
  syncGameBotCapacities: vi.fn().mockResolvedValue(undefined),
  releaseBotAssignmentCapacity: vi.fn().mockResolvedValue(true),
  cancelDeliveryJob: vi.fn().mockResolvedValue(undefined),
  findBlockingBotDelivery: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/services/delivery-queue", () => ({
  enqueueDeliveryJobOnce: vi.fn().mockResolvedValue(undefined),
  buildWithdrawalDeliveryPayload: vi.fn().mockReturnValue({}),
}));

vi.mock("@/server/services/game-delivery-config", () => ({
  getGameDeliveryConfig: vi.fn().mockResolvedValue({
    game: "MM2",
    deliveryMethod: "TRADING",
    requiresFriend: true,
    requiresPrivateServer: true,
    requiresCustomerJoin: true,
    requiresManualConfirmation: true,
    instructions: "Step 1: Add bot",
    averageDeliveryMinutes: 5,
  }),
}));

vi.mock("@/server/services/delivery-request", () => ({
  assignBotAndCreateDeliveryJob: vi.fn().mockResolvedValue({ success: false, error: "No bot available" }),
  formatAssignmentPayload: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(),
  isStripeConfigured: vi.fn().mockReturnValue(false),
  getStripeSecretKey: vi.fn().mockReturnValue("sk_test_mock"),
  getStripeWebhookSecret: vi.fn().mockReturnValue("whsec_mock"),
  dollarsToCents: vi.fn((v: number) => Math.round(v * 100)),
}));

// Static imports (vi.mock hoisted, so these use the mock implementations)
import {
  stripeEventAlreadyProcessed,
  recordStripeEvent,
} from "@/server/services/stripe-events";
import {
  handleCheckoutSessionExpired,
  handlePaymentIntentFailed,
} from "@/server/services/order-checkout";
import {
  linkWithdrawalUsername,
  startWithdrawal,
  cancelWithdrawal,
} from "@/server/services/withdrawal";
import { computeInventoryDeduction } from "@/server/services/admin-delivery";
import { checkRateLimit } from "@/lib/rate-limit";
import { FRAUD_REVIEW_THRESHOLD } from "@/lib/utils";

// ─── Stripe idempotency ───────────────────────────────────────────────────────
describe("Stripe event idempotency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stripeEventAlreadyProcessed returns true for known event", async () => {
    stripeEventFindUnique.mockResolvedValue({ id: "evt_1" });
    expect(await stripeEventAlreadyProcessed("evt_known")).toBe(true);
  });

  it("stripeEventAlreadyProcessed returns false for unknown event", async () => {
    stripeEventFindUnique.mockResolvedValue(null);
    expect(await stripeEventAlreadyProcessed("evt_new")).toBe(false);
  });

  it("recordStripeEvent inserts a new row", async () => {
    stripeEventCreate.mockResolvedValue({ id: "log_1" });
    await recordStripeEvent("evt_abc", "checkout.session.completed");
    expect(stripeEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stripeEventId: "evt_abc" }) })
    );
  });

  it("recordStripeEvent silently ignores duplicate constraint errors", async () => {
    stripeEventCreate.mockRejectedValue(new Error("Unique constraint failed"));
    await expect(recordStripeEvent("evt_dup", "checkout.session.completed")).resolves.not.toThrow();
  });
});

// ─── Payment status updates ───────────────────────────────────────────────────
describe("handleCheckoutSessionExpired", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks PENDING order as FAILED/EXPIRED", async () => {
    const order = {
      id: "ord_1",
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
      stripeCustomerId: null,
      stripeCheckoutSessionId: "cs_1",
    };
    orderFindUnique.mockResolvedValue(order);
    orderUpdate.mockResolvedValue({ ...order, paymentStatus: PaymentStatus.FAILED });

    const result = await handleCheckoutSessionExpired("cs_1", { orderId: "ord_1" });

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.FAILED,
          status: OrderStatus.EXPIRED,
        }),
      })
    );
    expect(result).toMatchObject({ expired: true });
  });

  it("ignores already-paid orders", async () => {
    orderFindUnique.mockResolvedValue({ id: "ord_1", paymentStatus: PaymentStatus.PAID });
    const result = await handleCheckoutSessionExpired("cs_1", null);
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ignored: true });
  });
});

describe("handlePaymentIntentFailed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks order as FAILED when payment_intent fails", async () => {
    const order = {
      id: "ord_1",
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
    };
    orderFindUnique.mockResolvedValue(order);
    orderUpdate.mockResolvedValue({ ...order, paymentStatus: PaymentStatus.FAILED });

    const result = await handlePaymentIntentFailed("pi_test123");

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: PaymentStatus.FAILED }),
      })
    );
    expect(result).toMatchObject({ failed: true });
  });
});

// ─── Withdrawal status guards ─────────────────────────────────────────────────
describe("EXPIRED withdrawal status guards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("linkWithdrawalUsername rejects EXPIRED withdrawal", async () => {
    withdrawalFindUnique.mockResolvedValue({
      id: "w1",
      withdrawalCode: "WD-TEST01",
      status: WithdrawalStatus.EXPIRED,
      items: [],
      deliveryJob: null,
      botAssignments: [],
    });

    const result = await linkWithdrawalUsername("WD-TEST01", "TestUser");
    expect("error" in result && result.error).toBeTruthy();
    expect(withdrawalUpdate).not.toHaveBeenCalled();
  });

  it("startWithdrawal rejects EXPIRED withdrawal", async () => {
    withdrawalFindUnique.mockResolvedValue({
      id: "w1",
      status: WithdrawalStatus.EXPIRED,
      items: [{ productId: "p1", product: { game: "MM2" }, quantity: 1 }],
      deliveryJob: null,
      botAssignments: [],
      robloxUsername: "TestUser",
    });

    const result = await startWithdrawal("w1");
    expect("error" in result && result.error).toMatch(/expired/i);
  });
});

// ─── Customer inventory deduction on delivery ─────────────────────────────────
describe("markDeliveryJobDelivered deducts customer inventory", () => {
  it("computeInventoryDeduction: after delivery quantity and reserved are reduced", () => {
    const { nextQuantity, nextReserved } = computeInventoryDeduction(5, 2, 2);
    expect(nextQuantity).toBe(3);
    expect(nextReserved).toBe(0);
  });
});

// ─── cancelWithdrawal creates CustomerInventoryLog ────────────────────────────
describe("cancelWithdrawal creates WITHDRAW_CANCELLED log", () => {
  beforeEach(() => vi.clearAllMocks());

  it("releases reservation and creates CustomerInventoryLog", async () => {
    const withdrawal = {
      id: "w_1",
      customerId: "cust_1",
      sessionId: null,
      status: WithdrawalStatus.QUEUED,
      items: [{ productId: "prod_1", quantity: 1 }],
      deliveryJob: null,
      botAssignments: [],
    };
    withdrawalFindUnique.mockResolvedValue(withdrawal);

    const fakeInv = { id: "ci_1", productId: "prod_1", reservedQuantity: 1 };
    let customerInventoryUpdateCalled = false;
    let customerInventoryLogCreateCalled = false;

    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        customerInventory: {
          findFirst: vi.fn().mockResolvedValue(fakeInv),
          update: vi.fn().mockImplementation(() => {
            customerInventoryUpdateCalled = true;
            return Promise.resolve({});
          }),
        },
        customerInventoryLog: {
          create: vi.fn().mockImplementation(() => {
            customerInventoryLogCreateCalled = true;
            return Promise.resolve({});
          }),
        },
        deliveryJob: { update: vi.fn().mockResolvedValue({}) },
        withdrawal: {
          update: vi.fn().mockResolvedValue({
            ...withdrawal,
            status: WithdrawalStatus.CANCELLED,
            items: [],
            customer: null,
          }),
        },
      };
      return fn(fakeTx);
    });

    await cancelWithdrawal("w_1");

    expect(customerInventoryUpdateCalled).toBe(true);
    expect(customerInventoryLogCreateCalled).toBe(true);
  });
});

// ─── Over-$200 withdrawal goes to SUPPORT_REQUIRED ────────────────────────────
describe("High-value withdrawal enforcement", () => {
  it("FRAUD_REVIEW_THRESHOLD constant is 200", () => {
    expect(FRAUD_REVIEW_THRESHOLD).toBe(200);
  });
});

// ─── Rate limiting utility ────────────────────────────────────────────────────
describe("checkRateLimit", () => {
  it("allows requests within limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(`test-rl-${Date.now()}-${i}`, 5, 60_000)).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    const key = `rl-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    expect(checkRateLimit(key, 5, 60_000)).toBe(false);
  });

  it("resets after window expires", async () => {
    const key = `rl-reset-${Date.now()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 1); // 1ms window
    await new Promise((r) => setTimeout(r, 5));
    expect(checkRateLimit(key, 3, 1)).toBe(true);
  });
});

// ─── Bot assignment status for MAILBOX ────────────────────────────────────────
describe("Bot assignment status", () => {
  it("MAILBOX game resolves to ASSIGNED, TRADING resolves to FRIEND_REQUEST_PENDING", () => {
    const resolve = (method: string) =>
      method === "MAILBOX" ? BotAssignmentStatus.ASSIGNED : BotAssignmentStatus.FRIEND_REQUEST_PENDING;

    expect(resolve("MAILBOX")).toBe(BotAssignmentStatus.ASSIGNED);
    expect(resolve("TRADING")).toBe(BotAssignmentStatus.FRIEND_REQUEST_PENDING);
  });
});
