import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/server/validators/delivery";
import {
  verifyAdminCredentials,
  createAdminSession,
} from "@/server/services/auth";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await verifyAdminCredentials(
      parsed.data.email.trim().toLowerCase(),
      parsed.data.password
    );

    if (!result.valid || !result.adminUserId) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const signedCookie = await createAdminSession(result.adminUserId);
    const response = NextResponse.json({ success: true });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      signedCookie,
      getAdminSessionCookieOptions()
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
