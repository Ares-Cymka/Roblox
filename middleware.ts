import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getClearAdminSessionCookieOptions,
} from "@/lib/admin-session";
import { verifySignedSessionCookieEdge } from "@/lib/admin-session-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never run auth middleware on the login page or login API.
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const isProtectedAdminPage = pathname.startsWith("/admin");
  const isProtectedAdminApi = pathname.startsWith("/api/admin");

  if (!isProtectedAdminPage && !isProtectedAdminApi) {
    return NextResponse.next();
  }

  const signedCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const hasValidSignature = Boolean(
    signedCookie && (await verifySignedSessionCookieEdge(signedCookie))
  );

  if (!hasValidSignature) {
    if (isProtectedAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);

    const response = NextResponse.redirect(loginUrl);
    if (signedCookie) {
      response.cookies.set(
        ADMIN_SESSION_COOKIE,
        "",
        getClearAdminSessionCookieOptions()
      );
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
