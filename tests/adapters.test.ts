import { describe, it, expect } from "vitest";
import { MockDeliveryAdapter } from "@/server/adapters/mock";

describe("MockDeliveryAdapter", () => {
  it("returns success for delivery jobs", async () => {
    const adapter = new MockDeliveryAdapter();
    const result = await adapter.deliver({
      deliveryJobId: "test-job-id",
      claimId: "test-claim-id",
      claimCode: "ABC12345",
      productName: "Test Product",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Test Product");
  });
});
