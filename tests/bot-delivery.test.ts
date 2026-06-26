import { describe, it, expect } from "vitest";
import { validateDetectedTradeItems } from "@/server/services/bot-delivery";

describe("validateDetectedTradeItems", () => {
  it("accepts matching detected items", () => {
    const result = validateDetectedTradeItems(
      [{ name: "Swirly Blade", quantity: 1 }],
      [{ name: "Swirly Blade", quantity: 1 }]
    );
    expect(result.ok).toBe(true);
  });

  it("rejects when expected item is missing", () => {
    const result = validateDetectedTradeItems(
      [{ name: "Celestial", quantity: 1 }],
      [{ name: "Swirly Blade", quantity: 1 }]
    );
    expect(result.ok).toBe(false);
  });

  it("rejects when detected quantity is too low", () => {
    const result = validateDetectedTradeItems(
      [{ name: "Swirly Blade", quantity: 2 }],
      [{ name: "Swirly Blade", quantity: 1 }]
    );
    expect(result.ok).toBe(false);
  });
});
