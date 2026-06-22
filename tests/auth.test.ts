import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "@/lib/auth";

describe("admin password verification", () => {
  it("accepts the correct password", async () => {
    const hash = await hashPassword("change-me-secure");
    await expect(comparePassword("change-me-secure", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("change-me-secure");
    await expect(comparePassword("wrong-password", hash)).resolves.toBe(false);
  });
});
