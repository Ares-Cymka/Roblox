import { BotStatus, DeliveryStatus, WithdrawalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AdminDashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalClaims: number;
  activeBots: number;
  pendingDeliveries: number;
  failedDeliveries: number;
  processingDeliveries: number;
  supportRequired: number;
  onlineBots: number;
  offlineBots: number;
  avgDeliveryMinutes: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    totalProducts,
    totalOrders,
    totalClaims,
    activeBots,
    pendingDeliveries,
    processingDeliveries,
    failedDeliveries,
    supportRequired,
    onlineBots,
    offlineBots,
    gameConfigs,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.claim.count(),
    prisma.botAccount.count({
      where: { status: { in: [BotStatus.ONLINE, BotStatus.BUSY] } },
    }),
    prisma.deliveryJob.count({
      where: {
        status: {
          in: [
            DeliveryStatus.QUEUED,
            DeliveryStatus.WAITING_USER,
            DeliveryStatus.RETRYING,
          ],
        },
      },
    }),
    prisma.deliveryJob.count({ where: { status: DeliveryStatus.PROCESSING } }),
    prisma.deliveryJob.count({ where: { status: DeliveryStatus.FAILED } }),
    prisma.withdrawal.count({ where: { status: WithdrawalStatus.SUPPORT_REQUIRED } }),
    prisma.botAccount.count({ where: { status: BotStatus.ONLINE } }),
    prisma.botAccount.count({
      where: { status: { in: [BotStatus.OFFLINE, BotStatus.DISABLED] } },
    }),
    prisma.gameDeliveryConfig.findMany({ select: { averageDeliveryMinutes: true } }),
  ]);

  const avgDeliveryMinutes =
    gameConfigs.length > 0
      ? Math.round(
          gameConfigs.reduce((s, c) => s + c.averageDeliveryMinutes, 0) / gameConfigs.length
        )
      : 5;

  return {
    totalProducts,
    totalOrders,
    totalClaims,
    activeBots,
    pendingDeliveries,
    processingDeliveries,
    failedDeliveries,
    supportRequired,
    onlineBots,
    offlineBots,
    avgDeliveryMinutes,
  };
}
