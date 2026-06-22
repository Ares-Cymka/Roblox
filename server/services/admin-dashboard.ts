import { BotStatus, DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AdminDashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalClaims: number;
  activeBots: number;
  pendingDeliveries: number;
  failedDeliveries: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    totalProducts,
    totalOrders,
    totalClaims,
    activeBots,
    pendingDeliveries,
    failedDeliveries,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.claim.count(),
    prisma.botAccount.count({
      where: {
        status: { in: [BotStatus.ONLINE, BotStatus.BUSY] },
      },
    }),
    prisma.deliveryJob.count({
      where: {
        status: {
          in: [
            DeliveryStatus.QUEUED,
            DeliveryStatus.PROCESSING,
            DeliveryStatus.WAITING_USER,
            DeliveryStatus.RETRYING,
          ],
        },
      },
    }),
    prisma.deliveryJob.count({
      where: { status: DeliveryStatus.FAILED },
    }),
  ]);

  return {
    totalProducts,
    totalOrders,
    totalClaims,
    activeBots,
    pendingDeliveries,
    failedDeliveries,
  };
}
