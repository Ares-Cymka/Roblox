/** Edge-safe HMAC verification for middleware (Web Crypto API). */

function safeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifySignedSessionCookieEdge(
  signedValue: string
): Promise<string | null> {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) return null;

    const separator = signedValue.lastIndexOf(".");
    if (separator <= 0) return null;

    const token = signedValue.slice(0, separator);
    const signature = signedValue.slice(separator + 1);
    const expected = await hmacSha256Hex(secret, token);

    if (!safeEqualStrings(signature, expected)) {
      return null;
    }

    return token;
  } catch {
    return null;
  }
}
