import { DeliveryStatus } from "@prisma/client";
import { getDeliveryQueue } from "@/server/queues/delivery";
import type { DeliveryJobData } from "@/server/adapters/types";

export async function enqueueDeliveryJobOnce(data: DeliveryJobData): Promise<boolean> {
  const queue = getDeliveryQueue();
  const existing = await queue.getJob(data.deliveryJobId);
  if (existing) return false;

  await queue.add("deliver", data, { jobId: data.deliveryJobId });
  return true;
}

export function buildWithdrawalDeliveryPayload(input: {
  deliveryJobId: string;
  withdrawalId: string;
  withdrawalCode: string;
  productName: string;
}): DeliveryJobData {
  return {
    deliveryJobId: input.deliveryJobId,
    withdrawalId: input.withdrawalId,
    withdrawalCode: input.withdrawalCode,
    productName: input.productName,
  };
}

export function buildClaimDeliveryPayload(input: {
  deliveryJobId: string;
  claimId: string;
  claimCode: string;
  productName: string;
}): DeliveryJobData {
  return {
    deliveryJobId: input.deliveryJobId,
    claimId: input.claimId,
    claimCode: input.claimCode,
    productName: input.productName,
  };
}

export const ACTIVE_DELIVERY_JOB_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.QUEUED,
  DeliveryStatus.PROCESSING,
  DeliveryStatus.RETRYING,
  DeliveryStatus.WAITING_USER,
];
