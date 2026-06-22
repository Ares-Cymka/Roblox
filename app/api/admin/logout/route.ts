import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeAdminSession } from "@/server/services/auth";
import {
  ADMIN_SESSION_COOKIE,
  getClearAdminSessionCookieOptions,
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = cookies();
  const signedCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (signedCookie) {
    try {
      await revokeAdminSession(signedCookie);
    } catch {
      // Best-effort logout
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    "",
    getClearAdminSessionCookieOptions()
  );

  return response;
}
