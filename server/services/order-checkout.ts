import {
  CustomerInventoryLogReason,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateOrderCode } from "@/lib/utils";
import {
  dollarsToCents,
  getStripeClient,
  isStripeConfigured,
} from "@/lib/stripe";
import { getEnv } from "@/lib/env";
import type { CreateCheckoutSessionInput } from "@/server/validators/checkout";

export type PricedCheckoutItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export function calculateCheckoutTotal(items: PricedCheckoutItem[]): number {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
}

export async function priceCheckoutItems(
  items: Array<{ productId: string; quantity: number }>
): Promise<PricedCheckoutItem[] | { error: string }> {
  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (products.length !== productIds.length) {
    return { error: "One or more products were not found" };
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const priced: PricedCheckoutItem[] = [];

  for (const item of items) {
    const product = productById.get(item.productId)!;
    const unitPrice = product.value ? Number(product.value) : null;

    if (unitPrice === null || unitPrice <= 0) {
      return {
        error: `Product "${product.name}" does not have a price configured`,
      };
    }

    priced.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
    });
  }

  return priced;
}

async function generateUniqueOrderCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const orderCode = generateOrderCode();
    const existing = await prisma.order.findUnique({
      where: { orderCode },
      select: { id: true },
    });
    if (!existing) return orderCode;
  }
  throw new Error("Failed to generate unique order code");
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured" as const };
  }

  const priced = await priceCheckoutItems(input.items);
  if ("error" in priced) {
    return { error: priced.error };
  }

  const totalAmount = calculateCheckoutTotal(priced);
  const orderCode = await generateUniqueOrderCode();
  const checkoutSessionId = input.sessionId?.trim() || crypto.randomUUID();
  const env = getEnv();

  const order = await prisma.order.create({
    data: {
      orderCode,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      customerEmail: input.customerEmail?.trim().toLowerCase(),
      sessionId: checkoutSessionId,
      totalAmount,
      currency: "usd",
      items: {
        create: priced.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitValue: item.unitPrice,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      },
    },
    include: {
      items: { include: { product: true } },
    },
  });

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: priced.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: dollarsToCents(item.unitPrice),
        product_data: {
          name: item.name,
        },
      },
    })),
    success_url: `${env.APP_URL}/inventory?sessionId=${encodeURIComponent(checkoutSessionId)}&paid=1`,
    cancel_url: `${env.APP_URL}/store?cancelled=1`,
    metadata: {
      orderId: order.id,
      orderCode: order.orderCode,
      sessionId: checkoutSessionId,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) {
    return { error: "Failed to create Stripe checkout session" as const };
  }

  return {
    checkoutUrl: session.url,
    orderId: order.id,
    orderCode: order.orderCode,
    sessionId: checkoutSessionId,
  };
}

export async function creditOrderInventory(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!order) {
    return { error: "Order not found" as const };
  }

  if (order.status === OrderStatus.INVENTORY_CREDITED) {
    return { order, alreadyCredited: true as const };
  }

  let customerId = order.customerId ?? undefined;

  if (order.customerEmail && !customerId) {
    const customer = await prisma.customer.upsert({
      where: { email: order.customerEmail },
      update: {},
      create: { email: order.customerEmail },
    });
    customerId = customer.id;
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId } });
    if (!current) throw new Error("ORDER_NOT_FOUND");
    if (current.status === OrderStatus.INVENTORY_CREDITED) return;

    for (const item of order.items) {
      const existingForOrder = await tx.customerInventory.findFirst({
        where: {
          sourceOrderId: order.id,
          productId: item.productId,
        },
      });

      if (existingForOrder) {
        continue;
      }

      const existingInventory = await tx.customerInventory.findFirst({
        where: {
          productId: item.productId,
          ...(customerId
            ? { customerId }
            : { sessionId: order.sessionId ?? undefined }),
        },
      });

      let inventoryId: string;
      let quantityBefore = 0;

      if (existingInventory) {
        quantityBefore = existingInventory.quantity;
        const updated = await tx.customerInventory.update({
          where: { id: existingInventory.id },
          data: {
            quantity: { increment: item.quantity },
            sourceOrderId: existingInventory.sourceOrderId ?? order.id,
          },
        });
        inventoryId = updated.id;
      } else {
        const created = await tx.customerInventory.create({
          data: {
            customerId: customerId ?? null,
            sessionId: customerId ? null : order.sessionId,
            productId: item.productId,
            quantity: item.quantity,
            sourceOrderId: order.id,
          },
        });
        inventoryId = created.id;
        quantityBefore = 0;
      }

      await tx.customerInventoryLog.create({
        data: {
          customerId: customerId ?? null,
          sessionId: customerId ? null : order.sessionId,
          productId: item.productId,
          orderId: order.id,
          delta: item.quantity,
          reason: CustomerInventoryLogReason.ORDER_PAID,
        },
      });

      void inventoryId;
      void quantityBefore;
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.INVENTORY_CREDITED,
        paymentStatus: PaymentStatus.PAID,
        customerId: customerId ?? order.customerId,
      },
    });
  });

  const updated = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      customerInventories: true,
    },
  });

  return { order: updated!, alreadyCredited: false as const };
}

export async function handleCheckoutSessionCompleted(session: {
  id: string;
  metadata?: Record<string, string> | null;
  payment_intent?: string | null;
  customer?: string | null;
}) {
  const orderId = session.metadata?.orderId;
  let order =
    orderId
      ? await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        })
      : null;

  if (!order) {
    order = await prisma.order.findUnique({
      where: { stripeCheckoutSessionId: session.id },
      include: { items: true },
    });
  }

  if (!order) {
    return { error: "Order not found" as const };
  }

  if (order.status === OrderStatus.INVENTORY_CREDITED) {
    return { order, alreadyCredited: true as const };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId ?? session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : order.stripePaymentIntentId,
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : order.stripeCustomerId,
      paidAt: order.paidAt ?? new Date(),
    },
  });

  return creditOrderInventory(order.id);
}

export async function handleCheckoutSessionExpired(
  stripeSessionId: string,
  metadata: Record<string, string> | null
) {
  const orderId = metadata?.orderId ?? undefined;

  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId } })
    : await prisma.order.findUnique({ where: { stripeCheckoutSessionId: stripeSessionId } });

  if (!order) return { ignored: true as const };
  if (order.paymentStatus === PaymentStatus.PAID) return { ignored: true as const };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: PaymentStatus.FAILED,
      status: OrderStatus.EXPIRED,
    },
  });

  return { order, expired: true as const };
}

export async function handlePaymentIntentFailed(stripePaymentIntentId: string) {
  const order = await prisma.order.findUnique({
    where: { stripePaymentIntentId },
  });

  if (!order) return { ignored: true as const };
  if (order.paymentStatus === PaymentStatus.PAID) return { ignored: true as const };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: PaymentStatus.FAILED,
      status: OrderStatus.FAILED,
    },
  });

  return { order, failed: true as const };
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: { include: { product: true } },
      claims: {
        select: { id: true, claimCode: true, status: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      customerInventories: {
        include: { product: true },
      },
      customerInventoryLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function listPaidOrders(limit = 50) {
  return prisma.order.findMany({
    where: {
      OR: [
        { paymentStatus: PaymentStatus.PAID },
        { status: OrderStatus.INVENTORY_CREDITED },
        { stripeCheckoutSessionId: { not: null } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      customer: true,
      items: { include: { product: true } },
      claims: {
        select: { id: true, claimCode: true, status: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      customerInventories: {
        select: { id: true, productId: true, quantity: true },
      },
      _count: { select: { items: true, customerInventoryLogs: true } },
    },
  });
}

export function orderInventoryCredited(order: {
  status: OrderStatus;
  customerInventories: unknown[];
}): boolean {
  return (
    order.status === OrderStatus.INVENTORY_CREDITED ||
    order.customerInventories.length > 0
  );
}
