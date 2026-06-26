import { api } from "./api-client";
import { config } from "./config";

export function startHeartbeat(): NodeJS.Timeout {
  async function beat() {
    try {
      await api.heartbeat("ACTIVE");
      console.log(`[heartbeat] OK`);
    } catch (err) {
      console.error(`[heartbeat] Failed:`, err instanceof Error ? err.message : err);
    }
  }

  beat();
  return setInterval(beat, config.heartbeatIntervalMs);
}
