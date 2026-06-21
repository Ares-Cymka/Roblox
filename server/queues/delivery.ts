import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "@/lib/redis";
import type { DeliveryJobData } from "@/server/adapters/types";

export const DELIVERY_QUEUE_NAME = "delivery";

let deliveryQueue: Queue<DeliveryJobData> | undefined;

export function getDeliveryQueue(): Queue<DeliveryJobData> {
  if (!deliveryQueue) {
    deliveryQueue = new Queue<DeliveryJobData>(DELIVERY_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  return deliveryQueue;
}

export async function enqueueDelivery(data: DeliveryJobData): Promise<string> {
  const queue = getDeliveryQueue();
  const job = await queue.add("deliver", data);
  return job.id ?? data.deliveryId;
}
