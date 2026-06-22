import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CustomerInventoryLogReason,
  OrderStatus,
  PaymentStatus,
  WithdrawalStatus,
} from "@prisma/client";

const {
  productFindMany,
  orderFindUnique,
  orderFindFirst,
  orderCreate,
  orderUpdate,
  orderFindMany,
  customerUpsert,
  customerInventoryFindFirst,
  customerInventoryCreate,
  customerInventoryUpdate,
  customerInventoryLogCreate,
  customerInventoryFindMany,
  customerFindUnique,
  withdrawalCreate,
  withdrawalFindUnique,
  transaction,
  stripeSessionsCreate,
  isStripeConfigured,
} = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  orderFindUnique: vi.fn(),
  orderFindFirst: vi.fn(),
  orderCreate: vi.fn(),
  orderUpdate: vi.fn(),
  orderFindMany: vi.fn(),
  customerUpsert: vi.fn(),
  customerInventoryFindFirst: vi.fn(),
  customerInventoryCreate: vi.fn(),
  customerInventoryUpdate: vi.fn(),
  customerInventoryLogCreate: vi.fn(),
  customerInventoryFindMany: vi.fn(),
  customerFindUnique: vi.fn(),
  withdrawalCreate: vi.fn(),
  withdrawalFindUnique: vi.fn(),
  transaction: vi.fn(),
  stripeSessionsCreate: vi.fn(),
  isStripeConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: productFindMany },
    order: {
      findUnique: orderFindUnique,
      findFirst: orderFindFirst,
      create: orderCreate,
      update: orderUpdate,
      findMany: orderFindMany,
    },
    customer: {
      upsert: customerUpsert,
      findUnique: customerFindUnique,
    },
    customerInventory: {
      findFirst: customerInventoryFindFirst,
      findMany: customerInventoryFindMany,
      create: customerInventoryCreate,
      update: customerInventoryUpdate,
    },
    customerInventoryLog: { create: customerInventoryLogCreate },
    withdrawal: { create: withdrawalCreate, findUnique: withdrawalFindUnique },
    $transaction: transaction,
  },
}));

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured,
  getStripeClient: vi.fn(() => ({
    checkout: { sessions: { create: stripeSessionsCreate } },
  })),
  dollarsToCents: (amount: number) => Math.round(amount * 100),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ APP_URL: "http://localhost:3000" }),
}));

vi.mock("@/server/services/customer-inventory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/customer-inventory")>();
  return {
    ...actual,
    reserveCustomerInventoryItems: vi.fn(),
  };
});

vi.mock("@/server/services/delivery-queue", () => ({
  buildWithdrawalDeliveryPayload: vi.fn(),
  enqueueDeliveryJobOnce: vi.fn(),
}));

vi.mock("@/server/services/delivery-request", () => ({
  assignBotAndCreateDeliveryJob: vi.fn(),
  formatAssignmentPayload: vi.fn(),
}));

vi.mock("@/server/services/bot-capacity", () => ({
  cancelDeliveryJob: vi.fn(),
  findBlockingBotDelivery: vi.fn(),
  releaseBotAssignmentCapacity: vi.fn(),
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
  calculateCheckoutTotal,
  createCheckoutSession,
  creditOrderInventory,
  handleCheckoutSessionCompleted,
  listPaidOrders,
  orderInventoryCredited,
  priceCheckoutItems,
} from "@/server/services/order-checkout";
import { lookupCustomerInventory } from "@/server/services/customer-inventory";
import { createWithdrawal } from "@/server/services/withdrawal";
import { FRAUD_REVIEW_THRESHOLD } from "@/lib/utils";

function buildPendingOrder(overrides?: Partial<{
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  sessionId: string;
  customerEmail: string | null;
}>) {
  return {
    id: overrides?.id ?? "order1",
    orderCode: "ORD-TEST123",
    status: overrides?.status ?? OrderStatus.PENDING,
    paymentStatus: overrides?.paymentStatus ?? PaymentStatus.PENDING,
    customerId: null,
    customerEmail: overrides?.customerEmail ?? "buyer@example.com",
    sessionId: overrides?.sessionId ?? "session-abc",
    stripeCheckoutSessionId: "cs_test_123",
    stripePaymentIntentId: null,
    totalAmount: 25,
    currency: "usd",
    items: [
      {
        id: "item1",
        productId: "product1",
        quantity: 2,
        unitPrice: 12.5,
        totalPrice: 25,
        product: {
          id: "product1",
          name: "Test Item",
          game: "MM2",
          value: 12.5,
        },
      },
    ],
    customerInventories: [],
  };
}

function mockTransaction() {
  transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      order: {
        findUnique: orderFindUnique,
        update: orderUpdate,
      },
      customerInventory: {
        findFirst: customerInventoryFindFirst,
        create: customerInventoryCreate,
        update: customerInventoryUpdate,
      },
      customerInventoryLog: {
        create: customerInventoryLogCreate,
      },
      customer: {
        upsert: customerUpsert,
      },
      withdrawal: {
        create: withdrawalCreate,
      },
    };
    return callback(tx);
  });
}

describe("checkout pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when product value is missing", async () => {
    productFindMany.mockResolvedValue([
      { id: "product1", name: "No Price Item", value: null },
    ]);

    const result = await priceCheckoutItems([{ productId: "product1", quantity: 1 }]);
    expect(result).toEqual({
      error: 'Product "No Price Item" does not have a price configured',
    });
  });

  it("calculates checkout total from priced items", () => {
    const total = calculateCheckoutTotal([
      {
        productId: "p1",
        name: "A",
        quantity: 2,
        unitPrice: 10,
        totalPrice: 20,
      },
      {
        productId: "p2",
        name: "B",
        quantity: 1,
        unitPrice: 5,
        totalPrice: 5,
      },
    ]);
    expect(total).toBe(25);
  });
});

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isStripeConfigured.mockReturnValue(true);
    productFindMany.mockResolvedValue([
      { id: "product1", name: "Test Item", value: 12.5 },
    ]);
    orderFindFirst.mockResolvedValue(null);
    orderCreate.mockResolvedValue(buildPendingOrder());
    stripeSessionsCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/test",
    });
    orderUpdate.mockResolvedValue({});
  });

  it("creates pending order and Stripe checkout session", async () => {
    const result = await createCheckoutSession({
      items: [{ productId: "product1", quantity: 2 }],
      customerEmail: "buyer@example.com",
      sessionId: "session-abc",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: 25,
          sessionId: "session-abc",
        }),
      })
    );
    expect(stripeSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ orderId: "order1" }),
      })
    );
    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/test");
  });
});

describe("Stripe webhook inventory credit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
  });

  it("marks order paid and credits customer inventory", async () => {
    const pendingOrder = buildPendingOrder();

    orderFindUnique.mockImplementation(async () => pendingOrder);
    customerUpsert.mockResolvedValue({ id: "customer1" });
    customerInventoryFindFirst.mockResolvedValue(null);
    customerInventoryCreate.mockResolvedValue({ id: "inv1", quantity: 2 });
    customerInventoryLogCreate.mockResolvedValue({ id: "log1" });
    orderUpdate.mockResolvedValue({});

    const result = await handleCheckoutSessionCompleted({
      id: "cs_test_123",
      metadata: { orderId: "order1" },
      payment_intent: "pi_test_123",
    });

    expect("error" in result).toBe(false);
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order1" },
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.PAID,
        }),
      })
    );
    expect(customerInventoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "product1",
          quantity: 2,
          sourceOrderId: "order1",
        }),
      })
    );
    expect(customerInventoryLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: CustomerInventoryLogReason.ORDER_PAID,
          delta: 2,
          orderId: "order1",
        }),
      })
    );
  });

  it("does not credit inventory twice on duplicate webhook", async () => {
    const creditedOrder = buildPendingOrder({
      status: OrderStatus.INVENTORY_CREDITED,
      paymentStatus: PaymentStatus.PAID,
    });

    orderFindUnique.mockResolvedValue(creditedOrder);

    const result = await handleCheckoutSessionCompleted({
      id: "cs_test_123",
      metadata: { orderId: "order1" },
      payment_intent: "pi_test_123",
    });

    expect(result.alreadyCredited).toBe(true);
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(customerInventoryCreate).not.toHaveBeenCalled();
    expect(customerInventoryLogCreate).not.toHaveBeenCalled();
  });

  it("creditOrderInventory is idempotent when order already credited", async () => {
    const creditedOrder = buildPendingOrder({
      status: OrderStatus.INVENTORY_CREDITED,
      paymentStatus: PaymentStatus.PAID,
    });
    orderFindUnique.mockResolvedValue(creditedOrder);

    const result = await creditOrderInventory("order1");

    expect(result.alreadyCredited).toBe(true);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("inventory lookup after payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows inventory credited from paid order", async () => {
    customerInventoryFindMany.mockResolvedValue([
      {
        id: "inv1",
        productId: "product1",
        quantity: 2,
        reservedQuantity: 0,
        product: {
          id: "product1",
          name: "Test Item",
          game: "MM2",
          rarity: "legendary",
          value: 12.5,
        },
        sourceOrder: { orderCode: "ORD-PAID123" },
      },
    ]);

    const result = await lookupCustomerInventory({ sessionId: "session-abc" });

    expect(result?.items[0]).toMatchObject({
      name: "Test Item",
      quantity: 2,
      available: 2,
      sourceOrderCode: "ORD-PAID123",
    });
  });
});

describe("fraud protection after payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
  });

  it("still routes withdrawals over $200 to SUPPORT_REQUIRED", async () => {
    withdrawalFindUnique.mockResolvedValue(null);
    customerInventoryFindMany.mockResolvedValue([
      {
        id: "inv1",
        customerId: "customer1",
        sessionId: null,
        productId: "product1",
        quantity: 1,
        reservedQuantity: 0,
        product: {
          id: "product1",
          name: "High Value Item",
          game: "MM2",
          value: 250,
        },
      },
    ]);

    withdrawalCreate.mockResolvedValue({
      id: "withdrawal1",
      withdrawalCode: "WD-HIGH",
      status: WithdrawalStatus.SUPPORT_REQUIRED,
      totalValue: 250,
      supportReason: "Withdrawal total exceeds fraud review threshold",
      items: [
        {
          id: "wi1",
          productId: "product1",
          quantity: 1,
          product: {
            id: "product1",
            name: "High Value Item",
            game: "MM2",
            value: 250,
          },
        },
      ],
      deliveryJob: null,
      botAssignments: [],
    });

    const result = await createWithdrawal({
      customerId: "customer1",
      items: [{ inventoryId: "inv1", quantity: 1 }],
    });

    expect(250).toBeGreaterThan(FRAUD_REVIEW_THRESHOLD);
    expect(withdrawalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WithdrawalStatus.SUPPORT_REQUIRED,
          totalValue: 250,
        }),
      })
    );
    expect(result.withdrawal.status).toBe("SUPPORT_REQUIRED");
  });
});

describe("admin orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists paid and credited orders", async () => {
    orderFindMany.mockResolvedValue([
      {
        ...buildPendingOrder({
          status: OrderStatus.INVENTORY_CREDITED,
          paymentStatus: PaymentStatus.PAID,
        }),
        customer: { email: "buyer@example.com" },
        claims: [],
        customerInventories: [{ id: "inv1", productId: "product1", quantity: 2 }],
        _count: { items: 1, customerInventoryLogs: 1 },
      },
    ]);

    const orders = await listPaidOrders();
    expect(orders).toHaveLength(1);
    expect(orderInventoryCredited(orders[0]!)).toBe(true);
    expect(orders[0]?.paymentStatus).toBe(PaymentStatus.PAID);
    expect(orders[0]?.status).toBe(OrderStatus.INVENTORY_CREDITED);
  });
});
