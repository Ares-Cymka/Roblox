import { describe, it, expect } from "vitest";
import {
  createWithdrawalSchema,
  inventoryLookupSchema,
  withdrawalUsernameSchema,
} from "@/server/validators/withdrawal";
import { FRAUD_REVIEW_THRESHOLD } from "@/lib/utils";

describe("withdrawal validators", () => {
  it("requires sessionId, testCode, or email for inventory lookup", () => {
    expect(inventoryLookupSchema.safeParse({}).success).toBe(false);
    expect(inventoryLookupSchema.safeParse({ testCode: "TESTPLAYER" }).success).toBe(true);
    expect(
      inventoryLookupSchema.safeParse({ email: "buyer@example.com" }).success
    ).toBe(true);
  });

  it("accepts withdrawal creation payload", () => {
    const result = createWithdrawalSchema.safeParse({
      testCode: "TESTPLAYER",
      items: [{ inventoryId: "inv1", quantity: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts roblox username for withdrawal continue", () => {
    const result = withdrawalUsernameSchema.safeParse({
      robloxUsername: "Player_One",
    });
    expect(result.success).toBe(true);
  });
});

describe("fraud threshold", () => {
  it("uses 200 as review threshold", () => {
    expect(FRAUD_REVIEW_THRESHOLD).toBe(200);
  });
});
