import { api } from "./api-client";
import { config } from "./config";

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function startStaleOrderWatcher(): NodeJS.Timeout {
  async function check() {
    try {
      const result = await api.expireStaleOrders(config.staleOrderTimeoutHours);

      if (result.expired > 0) {
        console.log(
          `[stale-order-watcher] Expired ${result.expired} stuck order(s): ${result.withdrawalCodes.join(", ")}`
        );
      }
    } catch (err) {
      console.error(
        "[stale-order-watcher] Error:",
        err instanceof Error ? err.message : err
      );
    }
  }

  check();
  return setInterval(check, POLL_INTERVAL_MS);
}
