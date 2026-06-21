import { Worker } from "bullmq";
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
      const { deliveryId, claimCode, productName } = job.data;

      await prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: "PROCESSING" },
      });

      const result = await adapter.deliver({ deliveryId, claimCode, productName });

      if (result.success) {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: { status: "COMPLETED", error: null },
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
    if (!job?.data?.deliveryId) return;

    await prisma.delivery.update({
      where: { id: job.data.deliveryId },
      data: {
        status: "FAILED",
        error: err.message,
      },
    });
  });
}
