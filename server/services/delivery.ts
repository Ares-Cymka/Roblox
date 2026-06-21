import { prisma } from "@/lib/prisma";
import { generateClaimCode } from "@/lib/utils";
import type { CreateDeliveryInput } from "@/server/validators/delivery";

export async function createDelivery(input: CreateDeliveryInput) {
  const claimCode = input.claimCode ?? generateClaimCode();

  const delivery = await prisma.delivery.create({
    data: {
      claimCode,
      productName: input.productName,
      status: "PENDING",
    },
  });

  const { enqueueDelivery } = await import("@/server/queues/delivery");
  await enqueueDelivery({
    deliveryId: delivery.id,
    claimCode: delivery.claimCode,
    productName: delivery.productName,
  });

  return delivery;
}

export async function getDeliveryByClaimCode(claimCode: string) {
  return prisma.delivery.findUnique({ where: { claimCode } });
}

export async function listDeliveries(limit = 50) {
  return prisma.delivery.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getDeliveryStats() {
  const [total, pending, processing, completed, failed] = await Promise.all([
    prisma.delivery.count(),
    prisma.delivery.count({ where: { status: "PENDING" } }),
    prisma.delivery.count({ where: { status: "PROCESSING" } }),
    prisma.delivery.count({ where: { status: "COMPLETED" } }),
    prisma.delivery.count({ where: { status: "FAILED" } }),
  ]);

  return { total, pending, processing, completed, failed };
}

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const { getEnv } = await import("@/lib/env");
  const env = getEnv();
  if (email !== env.ADMIN_EMAIL) return false;
  return password === env.ADMIN_PASSWORD;
}

export async function createAdminSession(): Promise<string> {
  const crypto = await import("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: { token, expiresAt },
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
