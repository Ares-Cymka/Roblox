import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  signSessionCookie,
  verifySignedSessionCookie,
} from "@/lib/admin-session";

import { verifySignedSessionCookieEdge } from "@/lib/admin-session-edge";

describe("admin session cookie", () => {
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET =
      "test-secret-key-that-is-long-enough-for-hmac-signing";
  });

  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
  });

  it("signs and verifies a session token", () => {
    const token = "abc123sessiontoken";
    const signed = signSessionCookie(token);
    expect(verifySignedSessionCookie(signed)).toBe(token);
  });

  it("edge verification matches node verification", async () => {
    const token = "abc123sessiontoken";
    const signed = signSessionCookie(token);
    expect(await verifySignedSessionCookieEdge(signed)).toBe(token);
  });

  it("rejects tampered cookies", () => {
    const signed = signSessionCookie("valid-token");
    const tampered = signed.slice(0, -1) + (signed.endsWith("a") ? "b" : "a");
    expect(verifySignedSessionCookie(tampered)).toBeNull();
  });

  it("rejects cookies without a signature", () => {
    expect(verifySignedSessionCookie("unsigned-token")).toBeNull();
  });
});
