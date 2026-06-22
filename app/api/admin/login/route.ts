import { NextRequest, NextResponse } from "next/server";
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

function loginRedirectUrl(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/admin/login", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function safeRedirectPath(value: FormDataEntryValue | null): string {
  const path = String(value ?? "").trim();
  if (path.startsWith("/admin") && path !== "/admin/login") {
    return path;
  }
  return "/admin/bots";
}

async function readCredentials(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    return {
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      from: typeof body.from === "string" ? body.from : "/admin",
      isFormSubmit: false,
    };
  }

  const formData = await request.formData();
  return {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    from: safeRedirectPath(formData.get("from")),
    isFormSubmit: true,
  };
}

export async function POST(request: NextRequest) {
  let credentials: Awaited<ReturnType<typeof readCredentials>>;

  try {
    credentials = await readCredentials(request);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse({
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    if (credentials.isFormSubmit) {
      return NextResponse.redirect(
        loginRedirectUrl(request, {
          error: message,
          from: credentials.from,
        }),
        303
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await verifyAdminCredentials(
      parsed.data.email,
      parsed.data.password
    );

    if (!result.valid || !result.adminUserId) {
      if (credentials.isFormSubmit) {
        return NextResponse.redirect(
          loginRedirectUrl(request, {
            error: "Invalid email or password",
            from: credentials.from,
          }),
          303
        );
      }
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const signedCookie = await createAdminSession(result.adminUserId);
    const redirectTarget = safeRedirectPath(credentials.from);

    if (credentials.isFormSubmit) {
      const response = NextResponse.redirect(
        new URL(redirectTarget, request.url),
        303
      );
      response.cookies.set(
        ADMIN_SESSION_COOKIE,
        signedCookie,
        getAdminSessionCookieOptions()
      );
      return response;
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      signedCookie,
      getAdminSessionCookieOptions()
    );
    return response;
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message.includes("SESSION_SECRET")
        ? "Server misconfigured: SESSION_SECRET missing or too short"
        : "Service unavailable. Please try again later.";

    if (credentials.isFormSubmit) {
      return NextResponse.redirect(
        loginRedirectUrl(request, {
          error: message,
          from: credentials.from,
        }),
        303
      );
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
