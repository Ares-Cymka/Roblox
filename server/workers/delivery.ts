import { Worker } from "bullmq";
import { DeliveryStatus } from "@prisma/client";
import { getRedisConnectionOptions } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { createDeliveryAdapter } from "@/server/adapters";
import { DELIVERY_QUEUE_NAME } from "@/server/queues/delivery";
import type { DeliveryJobData } from "@/server/adapters/types";

export function createDeliveryWorker(): Worker<DeliveryJobData> {
  const env = getEnv();
  const adapter = createDeliveryAdapter(env.DELIVERY_ADAPTER);

  return new Worker<DeliveryJobData>(
    DELIVERY_QUEUE_NAME,
    async (job) => {
      const { deliveryJobId, claimCode, productName } = job.data;

      await prisma.deliveryJob.update({
        where: { id: deliveryJobId },
        data: {
          status: DeliveryStatus.PROCESSING,
          attempts: { increment: 1 },
          lockedAt: new Date(),
        },
      });

      const result = await adapter.deliver({ ...job.data, claimCode, productName });

      if (result.success) {
        await prisma.deliveryJob.update({
          where: { id: deliveryJobId },
          data: {
            status: DeliveryStatus.DELIVERED,
            lastError: null,
            deliveredAt: new Date(),
            lockedAt: null,
          },
        });
        return result;
      }

      throw new Error(result.message);
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: env.DELIVERY_CONCURRENCY,
    }
  );
}

export function registerDeliveryWorkerHandlers(worker: Worker<DeliveryJobData>): void {
  worker.on("failed", async (job, err) => {
    if (!job?.data?.deliveryJobId) return;

    await prisma.deliveryJob.update({
      where: { id: job.data.deliveryJobId },
      data: {
        status: DeliveryStatus.FAILED,
        lastError: err.message,
        lockedAt: null,
      },
    });
  });
}
