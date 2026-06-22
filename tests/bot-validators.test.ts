import { describe, it, expect } from "vitest";
import {
  createBotAccountSchema,
  upsertBotInventorySchema,
} from "@/server/validators/bot";

describe("createBotAccountSchema", () => {
  it("accepts a valid MM2 bot payload without password fields", () => {
    const result = createBotAccountSchema.safeParse({
      game: "MM2",
      robloxUsername: "radiomirrorq",
      status: "ONLINE",
      maxConcurrentDeliveries: 1,
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing username", () => {
    const result = createBotAccountSchema.safeParse({
      game: "MM2",
      robloxUsername: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("upsertBotInventorySchema", () => {
  it("defaults reserved quantity to 0", () => {
    const result = upsertBotInventorySchema.parse({
      productId: "prod_123",
      quantity: 5,
    });

    expect(result.reservedQuantity).toBe(0);
  });
});
