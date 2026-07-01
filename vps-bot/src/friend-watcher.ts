import noblox from "noblox.js";
import { api, type WaitingEntry } from "./api-client";
import { config } from "./config";
import { resolveUserId } from "./user-resolver";

export function startFriendWatcher(): NodeJS.Timeout {
  async function poll() {
    try {
      const { waiting } = await api.getWaitingUsernames();

      const friendRequestWaiting = waiting.filter(
        (w): w is WaitingEntry & { withdrawalStatus: "WAITING_FRIEND_REQUEST" } =>
          w.withdrawalStatus === "WAITING_FRIEND_REQUEST"
      );

      if (friendRequestWaiting.length === 0) return;

      // Roblox's friend-requests API no longer includes the sender's username,
      // so match by resolved userId instead of name.
      const resolved = await Promise.all(
        friendRequestWaiting.map(async (w) => ({
          entry: w,
          userId: await resolveUserId(w.customerRobloxUsername),
        }))
      );

      const expectedMap = new Map(
        resolved
          .filter((r) => r.userId !== null)
          .map((r) => [r.userId as number, r.entry])
      );

      if (expectedMap.size === 0) return;

      const page = await noblox.getFriendRequests("Asc", 100);

      for (const req of page.data) {
        const entry = expectedMap.get(req.id);
        if (!entry) continue;

        await noblox.acceptFriendRequest(req.id);
        console.log(
          `[friend-watcher] Accepted friend request from ${entry.customerRobloxUsername}`
        );

        await api
          .friendAccepted(entry.customerRobloxUsername)
          .catch((err: Error) =>
            console.error(
              `[friend-watcher] friendAccepted failed for ${entry.customerRobloxUsername}:`,
              err.message
            )
          );
      }
    } catch (err) {
      console.error(`[friend-watcher] Poll error:`, err instanceof Error ? err.message : err);
    }
  }

  poll();
  return setInterval(poll, config.friendPollIntervalMs);
}
