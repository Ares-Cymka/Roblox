import { getEnvSafe } from "./env";

export function getRedisUrl(): string {
  const env = getEnvSafe();
  return env?.REDIS_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379";
}

export function getRedisConnectionOptions() {
  return {
    url: getRedisUrl(),
    maxRetriesPerRequest: null as null,
  };
}
