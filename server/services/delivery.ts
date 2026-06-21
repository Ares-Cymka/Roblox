import { prisma } from "@/lib/prisma";
import { generateClaimCode } from "@/lib/utils";
import type { CreateDeliveryInput } from "@/server/validators/delivery";
import { comparePassword } from "@/lib/auth";
import { DeliveryStatus, GameType } from "@prisma/client";

export async function createDelivery(input: CreateDeliveryInput) {
  const claimCode = input.claimCode ?? generateClaimCode();
  const orderCode = generateClaimCode();

  const product = await prisma.product.upsert({
    where: {
      game_itemId: {
        game: GameType.OTHER,
        itemId: "legacy-mock-item",
      },
    },
    update: { name: input.productName },
    create: {
      game: GameType.OTHER,
      itemId: "legacy-mock-item",
      name: input.productName,
      stock: 0,
    },
  });

  const order = await prisma.order.create({
    data: {
      orderCode,
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        },
      },
    },
  });

  const claim = await prisma.claim.create({
    data: {
      claimCode,
      orderId: order.id,
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        },
      },
    },
  });

  const deliveryJob = await prisma.deliveryJob.create({
    data: {
      claimId: claim.id,
      status: DeliveryStatus.QUEUED,
    },
  });

  const { enqueueDelivery } = await import("@/server/queues/delivery");
  await enqueueDelivery({
    deliveryJobId: deliveryJob.id,
    claimId: claim.id,
    claimCode: claim.claimCode,
    productName: input.productName,
  });

  return {
    id: deliveryJob.id,
    claimCode: claim.claimCode,
    productName: input.productName,
    status: deliveryJob.status,
    error: deliveryJob.lastError,
    createdAt: deliveryJob.createdAt,
  };
}

export async function getDeliveryByClaimCode(claimCode: string) {
  const claim = await prisma.claim.findUnique({
    where: { claimCode },
    include: {
      deliveryJob: true,
      items: {
        include: { product: true },
        take: 1,
      },
    },
  });

  if (!claim) return null;

  const productName =
    claim.items[0]?.product.name ?? "Unknown product";

  return {
    claimCode: claim.claimCode,
    productName,
    status: claim.deliveryJob?.status ?? claim.status,
    error: claim.deliveryJob?.lastError ?? null,
    createdAt: claim.createdAt,
  };
}

export async function listDeliveries(limit = 50) {
  const jobs = await prisma.deliveryJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      claim: {
        include: {
          items: {
            include: { product: true },
            take: 1,
          },
        },
      },
    },
  });

  return jobs.map((job) => ({
    id: job.id,
    claimCode: job.claim.claimCode,
    productName: job.claim.items[0]?.product.name ?? "Unknown product",
    status: job.status,
    createdAt: job.createdAt,
  }));
}

export async function getDeliveryStats() {
  const [total, queued, processing, delivered, failed] = await Promise.all([
    prisma.deliveryJob.count(),
    prisma.deliveryJob.count({ where: { status: DeliveryStatus.QUEUED } }),
    prisma.deliveryJob.count({
      where: {
        status: {
          in: [DeliveryStatus.PROCESSING, DeliveryStatus.WAITING_USER, DeliveryStatus.RETRYING],
        },
      },
    }),
    prisma.deliveryJob.count({ where: { status: DeliveryStatus.DELIVERED } }),
    prisma.deliveryJob.count({ where: { status: DeliveryStatus.FAILED } }),
  ]);

  return { total, pending: queued, processing, completed: delivered, failed };
}

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const adminUser = await prisma.adminUser.findUnique({ where: { email } });
  if (!adminUser?.isActive) return false;
  return comparePassword(password, adminUser.passwordHash);
}

export async function createAdminSession(adminUserId?: string): Promise<string> {
  const crypto = await import("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  let resolvedAdminUserId = adminUserId;
  if (!resolvedAdminUserId) {
    const { getEnv } = await import("@/lib/env");
    const env = getEnv();
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: env.ADMIN_EMAIL },
    });
    resolvedAdminUserId = adminUser?.id;
  }

  await prisma.adminSession.create({
    data: {
      token,
      expiresAt,
      adminUserId: resolvedAdminUserId,
    },
  });

  return token;
}

export async function validateAdminSession(token: string): Promise<boolean> {
  const session = await prisma.adminSession.findUnique({ where: { token } });
  if (!session) return false;
  if (session.expiresAt < new Date()) {
    await prisma.adminSession.delete({ where: { id: session.id } });
    return false;
  }
  return true;
}

export async function revokeAdminSession(token: string): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { token } });
}
