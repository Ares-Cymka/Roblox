import { describe, it, expect } from "vitest";
import { BotStatus } from "@prisma/client";
import {
  BOT_HEARTBEAT_MAX_AGE_MS,
  getBotHeartbeatCutoff,
  isBotLive,
} from "@/server/services/bot-presence";

describe("bot presence", () => {
  it("treats recent heartbeat as live", () => {
    expect(
      isBotLive({
        status: BotStatus.ONLINE,
        session: { lastHeartbeatAt: new Date() },
      })
    ).toBe(true);
  });

  it("treats stale heartbeat as offline", () => {
    const stale = new Date(Date.now() - BOT_HEARTBEAT_MAX_AGE_MS - 1_000);
    expect(
      isBotLive({
        status: BotStatus.ONLINE,
        session: { lastHeartbeatAt: stale },
      })
    ).toBe(false);
  });

  it("treats missing heartbeat as offline", () => {
    expect(
      isBotLive({
        status: BotStatus.ONLINE,
        session: null,
      })
    ).toBe(false);
  });

  it("uses cutoff based on max age", () => {
    const cutoff = getBotHeartbeatCutoff();
    const delta = Date.now() - cutoff.getTime();
    expect(delta).toBeGreaterThanOrEqual(BOT_HEARTBEAT_MAX_AGE_MS - 50);
    expect(delta).toBeLessThanOrEqual(BOT_HEARTBEAT_MAX_AGE_MS + 50);
  });
});
