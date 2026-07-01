import noblox from "noblox.js";
import { api, type WaitingEntry } from "./api-client";
import { config } from "./config";
import { resolveUserId } from "./user-resolver";
import { reconnectNoblox } from "./index";

const MAX_CONSECUTIVE_ERRORS = 5;
let consecutiveErrors = 0;

export function startPresenceWatcher(): NodeJS.Timeout {
  async function poll() {
    try {
      const { waiting } = await api.getWaitingUsernames();

      const joinWaiting = waiting.filter(
        (w): w is WaitingEntry & { withdrawalStatus: "WAITING_JOIN" } =>
          w.withdrawalStatus === "WAITING_JOIN"
      );

      if (joinWaiting.length === 0) {
        consecutiveErrors = 0;
        return;
      }

      // Resolve Roblox user IDs (with per-username cache).
      const resolved = await Promise.all(
        joinWaiting.map(async (w) => ({
          entry: w as WaitingEntry,
          userId: await resolveUserId(w.customerRobloxUsername),
        }))
      );

      const valid = resolved.filter(
        (r): r is { entry: WaitingEntry; userId: number } => r.userId !== null
      );

      if (valid.length === 0) {
        consecutiveErrors = 0;
        return;
      }

      const { userPresences } = await noblox.getPresences(valid.map((v) => v.userId));
      const presenceByUserId = new Map(userPresences.map((p) => [p.userId, p]));

      for (const { entry, userId } of valid) {
        const presence = presenceByUserId.get(userId);
        if (!presence) continue;

        // userPresenceType 2 = in-game
        const isInMM2 =
          presence.userPresenceType === 2 &&
          presence.placeId === config.mm2PlaceId;

        if (!isInMM2) continue;

        console.log(
          `[presence-watcher] ${entry.customerRobloxUsername} is in MM2 — advancing job ${entry.jobId}`
        );

        await api
          .customerJoined(entry.jobId)
          .catch((err: Error) =>
            console.error(
              `[presence-watcher] customerJoined failed for job ${entry.jobId}:`,
              err.message
            )
          );
      }

      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      console.error(
        `[presence-watcher] Poll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
        err instanceof Error ? err.message : err
      );

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        consecutiveErrors = 0;
        try {
          await reconnectNoblox();
        } catch (reconnectErr) {
          console.error(
            "[presence-watcher] Reconnect failed:",
            reconnectErr instanceof Error ? reconnectErr.message : reconnectErr
          );
        }
      }
    }
  }

  poll();
  return setInterval(poll, config.presencePollIntervalMs);
}
