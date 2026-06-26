import type { DeliveryAdapter, DeliveryJobData, DeliveryResult } from "./types";

export class ManualDeliveryAdapter implements DeliveryAdapter {
  readonly name = "manual";

  async deliver(_data: DeliveryJobData): Promise<DeliveryResult> {
    return {
      success: false,
      message:
        "Manual delivery mode — use the bot agent /api/bot/jobs/{jobId}/complete endpoint or admin Mark Delivered.",
    };
  }
}

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
    case "manual":
    case "auto":
      return new ManualDeliveryAdapter();
    default:
      throw new Error(`Unknown delivery adapter: ${type}`);
  }
}
