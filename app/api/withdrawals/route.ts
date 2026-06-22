import { NextRequest, NextResponse } from "next/server";
import { createWithdrawalSchema } from "@/server/validators/withdrawal";
import { createWithdrawal } from "@/server/services/withdrawal";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`withdrawal:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createWithdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await createWithdrawal(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create withdrawal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
