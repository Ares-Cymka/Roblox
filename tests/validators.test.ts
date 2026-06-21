import { describe, it, expect } from "vitest";
import { claimCodeSchema, adminLoginSchema } from "@/server/validators/delivery";

describe("claimCodeSchema", () => {
  it("accepts valid claim codes", () => {
    expect(claimCodeSchema.safeParse("ABC12345").success).toBe(true);
    expect(claimCodeSchema.safeParse("test-code-1").success).toBe(true);
  });

  it("rejects invalid claim codes", () => {
    expect(claimCodeSchema.safeParse("ab").success).toBe(false);
    expect(claimCodeSchema.safeParse("bad code!").success).toBe(false);
  });
});

describe("adminLoginSchema", () => {
  it("accepts valid login input", () => {
    const result = adminLoginSchema.safeParse({
      email: "admin@example.com",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = adminLoginSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });
});
