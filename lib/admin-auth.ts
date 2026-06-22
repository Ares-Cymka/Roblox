import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  getClearAdminSessionCookieOptions,
} from "@/lib/admin-session";
import { validateAdminSession } from "@/server/services/auth";

export async function requireAdminSession(): Promise<void> {
  const cookieStore = cookies();
  const signedCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!signedCookie) {
    redirect("/admin/login");
  }

  const valid = await validateAdminSession(signedCookie);
  if (!valid) {
    cookieStore.set(ADMIN_SESSION_COOKIE, "", getClearAdminSessionCookieOptions());
    redirect("/admin/login");
  }
}

export async function getAdminSessionCookieValue(): Promise<string | undefined> {
  return cookies().get(ADMIN_SESSION_COOKIE)?.value;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const signedCookie = await getAdminSessionCookieValue();
  if (!signedCookie) return false;
  return validateAdminSession(signedCookie);
}
