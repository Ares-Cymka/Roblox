import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  getClearAdminSessionCookieOptions,
  verifySignedSessionCookie,
} from "@/lib/admin-session";
import { validateAdminSession } from "@/server/services/auth";

export async function requireAdminSession(): Promise<void> {
  const cookieStore = cookies();
  const signedCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!signedCookie) {
    redirect("/admin/login?from=/admin");
  }

  const token = verifySignedSessionCookie(signedCookie);
  if (!token) {
    cookieStore.set(ADMIN_SESSION_COOKIE, "", getClearAdminSessionCookieOptions());
    redirect("/admin/login?error=Invalid+session.+Please+sign+in+again.");
  }

  try {
    const valid = await validateAdminSession(signedCookie);
    if (!valid) {
      cookieStore.set(ADMIN_SESSION_COOKIE, "", getClearAdminSessionCookieOptions());
      redirect("/admin/login?error=Session+expired.+Please+sign+in+again.");
    }
  } catch {
    cookieStore.set(ADMIN_SESSION_COOKIE, "", getClearAdminSessionCookieOptions());
    redirect("/admin/login?error=Database+unavailable.+Try+again+in+a+moment.");
  }
}

export async function getAdminSessionCookieValue(): Promise<string | undefined> {
  return cookies().get(ADMIN_SESSION_COOKIE)?.value;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const signedCookie = await getAdminSessionCookieValue();
  if (!signedCookie) return false;
  if (!verifySignedSessionCookie(signedCookie)) return false;
  try {
    return validateAdminSession(signedCookie);
  } catch {
    return false;
  }
}
