import "dotenv/config";

function required(key: string): string {
  const val = process.env[key]?.trim();
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  backendUrl: required("BACKEND_URL").replace(/\/$/, ""),
  botApiSecret: required("BOT_API_SECRET"),
  robloxCookie: required("ROBLOX_COOKIE"),
  botUsername: required("BOT_ROBLOX_USERNAME"),
  game: (process.env.GAME?.trim() ?? "MM2") as "MM2" | "ADOPT_ME" | "SAB" | "GAG2",
  mm2PlaceId: Number(process.env.MM2_PLACE_ID ?? "142823291"),
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS ?? "30000"),
  friendPollIntervalMs: Number(process.env.FRIEND_POLL_INTERVAL_MS ?? "5000"),
  presencePollIntervalMs: Number(process.env.PRESENCE_POLL_INTERVAL_MS ?? "10000"),
  staleOrderTimeoutHours: Number(process.env.STALE_ORDER_TIMEOUT_HOURS ?? "2"),
} as const;
