import noblox from "noblox.js";
import { api, type WaitingEntry } from "./api-client";
import { config } from "./config";

// Cache Roblox user IDs so we don't fetch them on every poll tick.
const userIdCache = new Map<string, number>();

async function resolveUserId(username: string): Promise<number | null> {
  const cached = userIdCache.get(username.toLowerCase());
  if (cached !== undefined) return cached;

  try {
    const id = await noblox.getIdFromUsername(username);
    userIdCache.set(username.toLowerCase(), id);
    return id;
  } catch {
    return null;
  }
}

export function startPresenceWatcher(): NodeJS.Timeout {
  async function poll() {
    try {
      const { waiting } = await api.getWaitingUsernames();

      const joinWaiting = waiting.filter(
        (w): w is WaitingEntry & { withdrawalStatus: "WAITING_JOIN" } =>
          w.withdrawalStatus === "WAITING_JOIN"
      );

      if (joinWaiting.length === 0) return;

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

      if (valid.length === 0) return;

      const presences = await noblox.getPresence(valid.map((v) => v.userId));

      for (let i = 0; i < valid.length; i++) {
        const presence = presences[i];
        const { entry } = valid[i];

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
    } catch (err) {
      console.error(`[presence-watcher] Poll error:`, err instanceof Error ? err.message : err);
    }
  }

  poll();
  return setInterval(poll, config.presencePollIntervalMs);
}
