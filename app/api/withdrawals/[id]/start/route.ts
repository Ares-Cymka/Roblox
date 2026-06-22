import { NextRequest, NextResponse } from "next/server";
import { startWithdrawal } from "@/server/services/withdrawal";

export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  "Withdrawal not found": 404,
  "Withdrawal requires support review": 409,
  "Withdrawal already delivered": 409,
  "Withdrawal cancelled": 409,
  "Invalid withdrawal status": 409,
  "Roblox username is required": 400,
  "No bot available": 503,
  "Not enough bot inventory": 409,
};

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const withdrawalId = context.params.id?.trim();
  if (!withdrawalId) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  try {
    const result = await startWithdrawal(withdrawalId);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, shortages: result.shortages },
        { status: ERROR_STATUS[result.error] ?? 400 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
