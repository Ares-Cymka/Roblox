import noblox from "noblox.js";
import { api, type WaitingEntry } from "./api-client";
import { config } from "./config";

export function startFriendWatcher(): NodeJS.Timeout {
  async function poll() {
    try {
      const { waiting } = await api.getWaitingUsernames();

      const friendRequestWaiting = waiting.filter(
        (w): w is WaitingEntry & { withdrawalStatus: "WAITING_FRIEND_REQUEST" } =>
          w.withdrawalStatus === "WAITING_FRIEND_REQUEST"
      );

      if (friendRequestWaiting.length === 0) return;

      const expectedMap = new Map(
        friendRequestWaiting.map((w) => [w.customerRobloxUsername.toLowerCase(), w])
      );

      const page = await noblox.getFriendRequests({ sortOrder: "Asc", limit: 100 });

      for (const req of page.data) {
        const entry = expectedMap.get(req.name.toLowerCase());
        if (!entry) continue;

        await noblox.acceptFriendRequest(req.id);
        console.log(`[friend-watcher] Accepted friend request from ${req.name}`);

        await api
          .friendAccepted(req.name)
          .catch((err: Error) =>
            console.error(`[friend-watcher] friendAccepted failed for ${req.name}:`, err.message)
          );
      }
    } catch (err) {
      console.error(`[friend-watcher] Poll error:`, err instanceof Error ? err.message : err);
    }
  }

  poll();
  return setInterval(poll, config.friendPollIntervalMs);
}
