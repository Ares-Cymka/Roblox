import crypto from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters.");
  }
  return secret;
}

function safeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function signSessionCookie(token: string): string {
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(token)
    .digest("hex");
  return `${token}.${signature}`;
}

export function verifySignedSessionCookie(signedValue: string): string | null {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) return null;

    const separator = signedValue.lastIndexOf(".");
    if (separator <= 0) return null;

    const token = signedValue.slice(0, separator);
    const signature = signedValue.slice(separator + 1);
    const expected = crypto
      .createHmac("sha256", secret)
      .update(token)
      .digest("hex");

    if (!safeEqualStrings(signature, expected)) {
      return null;
    }

    return token;
  } catch {
    return null;
  }
}

export function getAdminSessionCookieOptions(maxAge = ADMIN_SESSION_MAX_AGE) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function getClearAdminSessionCookieOptions() {
  return {
    ...getAdminSessionCookieOptions(0),
    maxAge: 0,
  };
}
