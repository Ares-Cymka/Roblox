import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifySignedSessionCookie,
} from "@/lib/admin-session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/login";
  const isProtectedAdminPage = pathname.startsWith("/admin") && !isLoginPage;
  const isProtectedAdminApi =
    pathname.startsWith("/api/admin") && !isLoginApi;

  const signedCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const hasValidSignature = Boolean(
    signedCookie && verifySignedSessionCookie(signedCookie)
  );

  if (isLoginPage) {
    if (hasValidSignature) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedAdminPage && !isProtectedAdminApi) {
    return NextResponse.next();
  }

  if (!hasValidSignature) {
    if (isProtectedAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
