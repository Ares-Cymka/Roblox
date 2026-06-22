import { DeliveryStatus, GameType, WithdrawalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameDeliveryConfig } from "@/server/services/game-delivery-config";

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.QUEUED,
  DeliveryStatus.WAITING_USER,
  DeliveryStatus.PROCESSING,
  DeliveryStatus.RETRYING,
];

const QUEUED_WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  WithdrawalStatus.QUEUED,
  WithdrawalStatus.WAITING_FRIEND_REQUEST,
  WithdrawalStatus.WAITING_JOIN,
  WithdrawalStatus.PROCESSING,
];

export async function getWithdrawalQueueInfo(
  withdrawalId: string,
  game: GameType
): Promise<{ queuePosition: number; estimatedWaitMinutes: number }> {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    select: { createdAt: true, status: true },
  });

  if (!withdrawal || !QUEUED_WITHDRAWAL_STATUSES.includes(withdrawal.status)) {
    return { queuePosition: 0, estimatedWaitMinutes: 0 };
  }

  // Count active delivery jobs for the same game created before this withdrawal
  const position = await prisma.deliveryJob.count({
    where: {
      status: { in: ACTIVE_DELIVERY_STATUSES },
      createdAt: { lt: withdrawal.createdAt },
      OR: [
        {
          withdrawal: {
            items: { some: { product: { game } } },
          },
        },
        {
          claim: {
            items: { some: { product: { game } } },
          },
        },
      ],
    },
  });

  const config = await getGameDeliveryConfig(game);
  const avgMinutes = config?.averageDeliveryMinutes ?? 5;
  const estimatedWaitMinutes = position * avgMinutes;

  return { queuePosition: position + 1, estimatedWaitMinutes };
}

export async function getDashboardQueueStats() {
  const [
    activeQueue,
    processing,
    failed,
    supportRequired,
    onlineBots,
    offlineBots,
    busyBots,
    disabledBots,
  ] = await Promise.all([
    prisma.deliveryJob.count({
      where: { status: { in: [DeliveryStatus.QUEUED, DeliveryStatus.WAITING_USER, DeliveryStatus.RETRYING] } },
    }),
    prisma.deliveryJob.count({
      where: { status: DeliveryStatus.PROCESSING },
    }),
    prisma.deliveryJob.count({ where: { status: DeliveryStatus.FAILED } }),
    prisma.withdrawal.count({ where: { status: WithdrawalStatus.SUPPORT_REQUIRED } }),
    prisma.botAccount.count({ where: { status: "ONLINE" } }),
    prisma.botAccount.count({ where: { status: "OFFLINE" } }),
    prisma.botAccount.count({ where: { status: "BUSY" } }),
    prisma.botAccount.count({ where: { status: "DISABLED" } }),
  ]);

  const configs = await prisma.gameDeliveryConfig.findMany({
    select: { averageDeliveryMinutes: true },
  });
  const avgDeliveryMinutes =
    configs.length > 0
      ? Math.round(configs.reduce((s, c) => s + c.averageDeliveryMinutes, 0) / configs.length)
      : 5;

  return {
    activeQueue,
    processing,
    failed,
    supportRequired,
    onlineBots,
    offlineBots,
    busyBots,
    disabledBots,
    avgDeliveryMinutes,
  };
}
