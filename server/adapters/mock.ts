import type { DeliveryAdapter, DeliveryJobData, DeliveryResult } from "./types";

export class MockDeliveryAdapter implements DeliveryAdapter {
  readonly name = "mock";

  async deliver(data: DeliveryJobData): Promise<DeliveryResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const reference = data.withdrawalCode ?? data.claimCode ?? data.deliveryJobId;

    return {
      success: true,
      message: `Mock delivery completed for ${data.productName} (${reference})`,
    };
  }
}

export function createDeliveryAdapter(type: string): DeliveryAdapter {
  switch (type) {
    case "mock":
      return new MockDeliveryAdapter();
    default:
      throw new Error(`Unknown delivery adapter: ${type}`);
  }
}
