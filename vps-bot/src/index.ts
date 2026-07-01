import noblox from "noblox.js";
import "dotenv/config";
import { config } from "./config";
import { startHeartbeat } from "./heartbeat";
import { startFriendWatcher } from "./friend-watcher";
import { startPresenceWatcher } from "./presence-watcher";
import { startStaleOrderWatcher } from "./stale-order-watcher";

async function validateAndSetCookie() {
  // Validate the cookie directly against Roblox's auth endpoint first —
  // noblox.js's own setCookie() validation calls the retired /mobileapi/userinfo
  // endpoint (404 on current Roblox), so we skip it and validate via the
  // still-supported users.roblox.com endpoint instead.
  const res = await fetch("https://users.roblox.com/v1/users/authenticated", {
    headers: { Cookie: `.ROBLOSECURITY=${config.robloxCookie}` },
  });

  if (!res.ok) {
    throw new Error(`Roblox cookie invalid or expired (HTTP ${res.status})`);
  }

  const me = (await res.json()) as { id: number; name: string };

  if (me.name.toLowerCase() !== config.botUsername.toLowerCase()) {
    throw new Error(
      `Cookie mismatch: authenticated as "${me.name}" but BOT_ROBLOX_USERNAME="${config.botUsername}"`
    );
  }

  await noblox.setCookie(config.robloxCookie, false);
  console.log(`[bot] Authenticated as: ${me.name} (${me.id})`);
}

export async function reconnectNoblox(): Promise<void> {
  console.log("[bot] Reconnecting to Roblox...");
  await validateAndSetCookie();
  console.log("[bot] Reconnected.");
}

async function main() {
  console.log("[bot] Starting RngBlox VPS Bot (Node.js)...");
  console.log(`[bot] Backend  : ${config.backendUrl}`);
  console.log(`[bot] Game     : ${config.game}`);
  console.log(`[bot] MM2 Place: ${config.mm2PlaceId}`);

  await validateAndSetCookie();

  startHeartbeat();
  startFriendWatcher();
  startPresenceWatcher();
  startStaleOrderWatcher();

  console.log("[bot] All services running.");
  console.log(`[bot]  · Heartbeat    every ${config.heartbeatIntervalMs / 1000}s`);
  console.log(`[bot]  · Friend poll  every ${config.friendPollIntervalMs / 1000}s`);
  console.log(`[bot]  · Presence     every ${config.presencePollIntervalMs / 1000}s`);
  console.log(`[bot]  · Stale orders every 600s (timeout ${config.staleOrderTimeoutHours}h)`);

  process.on("SIGINT", () => {
    console.log("[bot] Received SIGINT — shutting down.");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("[bot] Received SIGTERM — shutting down.");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[bot] Fatal startup error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
