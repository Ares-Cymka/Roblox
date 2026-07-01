import noblox from "noblox.js";
import { api, type WaitingEntry } from "./api-client";
import { config } from "./config";
import { reconnectNoblox } from "./index";

const MAX_CONSECUTIVE_ERRORS = 5;
let consecutiveErrors = 0;

export function startFriendWatcher(): NodeJS.Timeout {
  async function poll() {
    try {
      const { waiting } = await api.getWaitingUsernames();

      const friendRequestWaiting = waiting.filter(
        (w): w is WaitingEntry & { withdrawalStatus: "WAITING_FRIEND_REQUEST" } =>
          w.withdrawalStatus === "WAITING_FRIEND_REQUEST"
      );

      if (friendRequestWaiting.length === 0) {
        consecutiveErrors = 0;
        return;
      }

      const expectedMap = new Map(
        friendRequestWaiting.map((w) => [w.customerRobloxUsername.toLowerCase(), w])
      );

      const page = await noblox.getFriendRequests("Asc", 100);

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

      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      console.error(
        `[friend-watcher] Poll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
        err instanceof Error ? err.message : err
      );

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        consecutiveErrors = 0;
        try {
          await reconnectNoblox();
        } catch (reconnectErr) {
          console.error(
            "[friend-watcher] Reconnect failed:",
            reconnectErr instanceof Error ? reconnectErr.message : reconnectErr
          );
        }
      }
    }
  }

  poll();
  return setInterval(poll, config.friendPollIntervalMs);
}
