import noblox from "noblox.js";

const userIdCache = new Map<string, number>();

export async function resolveUserId(username: string): Promise<number | null> {
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
