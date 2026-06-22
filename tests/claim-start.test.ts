import { describe, it, expect } from "vitest";
import {
  botHasSufficientInventory,
  getAvailableInventory,
  selectEligibleBot,
} from "@/server/services/claim-start";
import { BotStatus } from "@prisma/client";

describe("claim start inventory helpers", () => {
  it("calculates available inventory", () => {
    expect(getAvailableInventory(10, 3)).toBe(7);
  });

  it("checks bot inventory coverage", () => {
    const inventories = [
      { productId: "p1", quantity: 5, reservedQuantity: 1 },
      { productId: "p2", quantity: 2, reservedQuantity: 0 },
    ];

    expect(
      botHasSufficientInventory(inventories, [{ productId: "p1", quantity: 4 }])
    ).toBe(true);

    expect(
      botHasSufficientInventory(inventories, [{ productId: "p1", quantity: 5 }])
    ).toBe(false);

    expect(
      botHasSufficientInventory(inventories, [{ productId: "p3", quantity: 1 }])
    ).toBe(false);
  });

  it("selects the least busy eligible online bot", () => {
    const bots = [
      {
        id: "b1",
        robloxUsername: "busybot",
        status: BotStatus.ONLINE,
        currentDeliveries: 2,
        maxConcurrentDeliveries: 3,
        profileUrl: "https://example.com/busybot",
        privateServerUrl: null,
        inventories: [{ productId: "p1", quantity: 5, reservedQuantity: 0 }],
      },
      {
        id: "b2",
        robloxUsername: "radiomirrorq",
        status: BotStatus.ONLINE,
        currentDeliveries: 0,
        maxConcurrentDeliveries: 1,
        profileUrl: "https://example.com/radiomirrorq",
        privateServerUrl: null,
        inventories: [{ productId: "p1", quantity: 5, reservedQuantity: 0 }],
      },
    ];

    const selected = selectEligibleBot(bots, [{ productId: "p1", quantity: 1 }]);
    expect(selected?.robloxUsername).toBe("radiomirrorq");
  });

  it("skips bots without enough available inventory", () => {
    const bots = [
      {
        id: "b1",
        robloxUsername: "lowstock",
        status: BotStatus.ONLINE,
        currentDeliveries: 0,
        maxConcurrentDeliveries: 1,
        profileUrl: "https://example.com/lowstock",
        privateServerUrl: null,
        inventories: [{ productId: "p1", quantity: 1, reservedQuantity: 1 }],
      },
    ];

    expect(selectEligibleBot(bots, [{ productId: "p1", quantity: 1 }])).toBeNull();
  });
});
