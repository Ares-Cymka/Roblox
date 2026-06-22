/**
 * Simple sliding-window rate limiter using an in-memory Map.
 * For multi-instance production use, replace with a Redis-backed
 * implementation (e.g. upstash/ratelimit).
 *
 * Usage:
 *   const allowed = checkRateLimit(`checkout:${ip}`, 5, 60_000); // 5 per minute
 *   if (!allowed) return 429;
 */

type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();

/**
 * Returns true if the request is within limits, false if it should be blocked.
 * @param key      Unique identifier (e.g. "checkout:127.0.0.1")
 * @param limit    Max requests allowed in the window
 * @param windowMs Rolling window in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

/** Extract a best-effort client IP from Next.js request headers. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
