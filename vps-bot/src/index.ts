import noblox from "noblox.js";
import "dotenv/config";
import { config } from "./config";
import { startHeartbeat } from "./heartbeat";
import { startFriendWatcher } from "./friend-watcher";
import { startPresenceWatcher } from "./presence-watcher";

async function main() {
  console.log("[bot] Starting RngBlox VPS Bot (Node.js)...");
  console.log(`[bot] Backend  : ${config.backendUrl}`);
  console.log(`[bot] Game     : ${config.game}`);
  console.log(`[bot] MM2 Place: ${config.mm2PlaceId}`);

  await noblox.setCookie(config.robloxCookie);
  const me = await noblox.getCurrentUser();
  console.log(`[bot] Authenticated as: ${me.UserName} (${me.UserId})`);

  if (me.UserName.toLowerCase() !== config.botUsername.toLowerCase()) {
    throw new Error(
      `Cookie mismatch: authenticated as "${me.UserName}" but BOT_ROBLOX_USERNAME="${config.botUsername}"`
    );
  }

  startHeartbeat();
  startFriendWatcher();
  startPresenceWatcher();

  console.log("[bot] All services running.");
  console.log(`[bot]  · Heartbeat   every ${config.heartbeatIntervalMs / 1000}s`);
  console.log(`[bot]  · Friend poll every ${config.friendPollIntervalMs / 1000}s`);
  console.log(`[bot]  · Presence    every ${config.presencePollIntervalMs / 1000}s`);

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
