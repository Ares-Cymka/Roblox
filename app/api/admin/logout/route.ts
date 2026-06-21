import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeAdminSession } from "@/server/services/delivery";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (token) {
    try {
      await revokeAdminSession(token);
    } catch {
      // Best-effort logout
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
