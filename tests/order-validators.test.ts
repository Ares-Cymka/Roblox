import { describe, it, expect } from "vitest";
import {
  claimContinueSchema,
  claimLookupSchema,
  createTestOrderSchema,
} from "@/server/validators/order";

describe("createTestOrderSchema", () => {
  it("accepts a valid test order payload", () => {
    const result = createTestOrderSchema.safeParse({
      game: "MM2",
      robloxUsername: "TestPlayer",
      items: [{ productId: "prod_123", quantity: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one product", () => {
    const result = createTestOrderSchema.safeParse({
      game: "MM2",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("allows empty customer username", () => {
    const result = createTestOrderSchema.safeParse({
      game: "MM2",
      robloxUsername: "",
      items: [{ productId: "prod_123", quantity: 1 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.robloxUsername).toBeUndefined();
    }
  });
});

describe("claimLookupSchema", () => {
  it("accepts valid claim codes", () => {
    const result = claimLookupSchema.safeParse({ claimCode: "ABC12345" });
    expect(result.success).toBe(true);
  });
});

describe("claimContinueSchema", () => {
  it("accepts valid continue payload", () => {
    const result = claimContinueSchema.safeParse({
      claimCode: "ABC12345",
      robloxUsername: "Player_One",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid usernames", () => {
    const result = claimContinueSchema.safeParse({
      claimCode: "ABC12345",
      robloxUsername: "bad name",
    });
    expect(result.success).toBe(false);
  });
});
