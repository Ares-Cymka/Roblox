import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getCustomerInventoryAvailable(
  quantity: number,
  reservedQuantity: number
): number {
  return quantity - reservedQuantity;
}

export async function lookupCustomerInventory(params: {
  sessionId?: string;
  testCode?: string;
}) {
  const sessionId = params.sessionId?.trim();
  const testCode = params.testCode?.trim().toUpperCase();

  if (!sessionId && !testCode) {
    return null;
  }

  let customerId: string | undefined;
  if (testCode) {
    const customer = await prisma.customer.findUnique({ where: { testCode } });
    if (!customer) return null;
    customerId = customer.id;
  }

  const inventories = await prisma.customerInventory.findMany({
    where: customerId
      ? { customerId }
      : { sessionId },
    include: { product: true },
    orderBy: { updatedAt: "desc" },
  });

  return {
    customerId,
    sessionId: customerId ? undefined : sessionId,
    testCode: testCode ?? null,
    items: inventories.map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      name: entry.product.name,
      game: entry.product.game,
      rarity: entry.product.rarity,
      value: entry.product.value ? Number(entry.product.value) : 0,
      quantity: entry.quantity,
      available: getCustomerInventoryAvailable(
        entry.quantity,
        entry.reservedQuantity
      ),
    })),
  };
}

export async function listCustomerInventories(limit = 100) {
  return prisma.customerInventory.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: {
      product: true,
      customer: true,
    },
  });
}

export async function createTestCustomerInventory(input: {
  productId: string;
  quantity: number;
  customerId?: string;
  sessionId?: string;
  testCode?: string;
  sourceOrderId?: string;
}) {
  if (!input.customerId && !input.sessionId && !input.testCode) {
    throw new Error("customerId, sessionId, or testCode is required");
  }

  let customerId = input.customerId;

  if (input.testCode) {
    const customer = await prisma.customer.upsert({
      where: { testCode: input.testCode.trim().toUpperCase() },
      update: {},
      create: { testCode: input.testCode.trim().toUpperCase() },
    });
    customerId = customer.id;
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const existing = await prisma.customerInventory.findFirst({
    where: {
      productId: input.productId,
      ...(customerId ? { customerId } : { sessionId: input.sessionId }),
    },
  });

  if (existing) {
    return prisma.customerInventory.update({
      where: { id: existing.id },
      data: { quantity: { increment: input.quantity } },
      include: { product: true, customer: true },
    });
  }

  return prisma.customerInventory.create({
    data: {
      customerId,
      sessionId: customerId ? null : input.sessionId,
      productId: input.productId,
      quantity: input.quantity,
      sourceOrderId: input.sourceOrderId,
    },
    include: { product: true, customer: true },
  });
}

export async function reserveCustomerInventoryItems(
  tx: Prisma.TransactionClient,
  items: Array<{ inventoryId: string; quantity: number }>
) {
  for (const item of items) {
    const inventory = await tx.customerInventory.findUnique({
      where: { id: item.inventoryId },
    });

    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const available = getCustomerInventoryAvailable(
      inventory.quantity,
      inventory.reservedQuantity
    );

    if (available < item.quantity) {
      throw new Error("INSUFFICIENT_CUSTOMER_INVENTORY");
    }

    await tx.customerInventory.update({
      where: { id: inventory.id },
      data: { reservedQuantity: { increment: item.quantity } },
    });
  }
}
