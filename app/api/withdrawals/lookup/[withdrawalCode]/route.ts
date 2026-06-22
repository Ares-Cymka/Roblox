import { NextRequest, NextResponse } from "next/server";
import { withdrawalUsernameSchema } from "@/server/validators/withdrawal";
import {
  getWithdrawalByCode,
  linkWithdrawalUsername,
} from "@/server/services/withdrawal";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { withdrawalCode: string };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const withdrawalCode = context.params.withdrawalCode?.trim();
  if (!withdrawalCode) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  try {
    const result = await getWithdrawalByCode(withdrawalCode);
    if (!result) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to load withdrawal" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const withdrawalCode = context.params.withdrawalCode?.trim();
  if (!withdrawalCode) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = withdrawalUsernameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await linkWithdrawalUsername(
      withdrawalCode,
      parsed.data.robloxUsername
    );

    if ("error" in result) {
      const status = result.error === "Withdrawal not found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to update withdrawal" }, { status: 500 });
  }
}
