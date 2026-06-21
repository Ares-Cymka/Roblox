import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/server/validators/delivery";
import {
  verifyAdminCredentials,
  createAdminSession,
} from "@/server/services/delivery";

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
    const valid = await verifyAdminCredentials(
      parsed.data.email,
      parsed.data.password
    );

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: parsed.data.email },
    });

    const token = await createAdminSession(adminUser?.id);
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
