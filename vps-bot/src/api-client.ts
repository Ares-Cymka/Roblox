import { config } from "./config";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${config.botApiSecret}`,
};

async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${config.backendUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...BASE_HEADERS, ...(init?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[api] ${init?.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface WaitingEntry {
  jobId: string;
  withdrawalId: string;
  customerRobloxUsername: string;
  botRobloxUsername: string | null;
  game: string;
  withdrawalStatus: "WAITING_FRIEND_REQUEST" | "WAITING_JOIN";
}

export const api = {
  heartbeat(status: "IDLE" | "ACTIVE" | "BUSY" | "ERROR") {
    return apiFetch("/api/bot/heartbeat", {
      method: "POST",
      body: JSON.stringify({
        botRobloxUsername: config.botUsername,
        game: config.game,
        status,
      }),
    });
  },

  getWaitingUsernames(): Promise<{ waiting: WaitingEntry[] }> {
    return apiFetch("/api/bot/waiting-usernames");
  },

  friendAccepted(customerRobloxUsername: string) {
    return apiFetch("/api/bot/friend-accepted", {
      method: "POST",
      body: JSON.stringify({
        customerRobloxUsername,
        botRobloxUsername: config.botUsername,
      }),
    });
  },

  customerJoined(jobId: string) {
    return apiFetch(`/api/bot/jobs/${jobId}/customer-joined`, {
      method: "POST",
    });
  },

  expireStaleOrders(timeoutHours: number) {
    return apiFetch<{ expired: number; total: number; withdrawalCodes: string[] }>(
      "/api/bot/expire-stale-orders",
      {
        method: "POST",
        body: JSON.stringify({ timeoutHours }),
      }
    );
  },
};
