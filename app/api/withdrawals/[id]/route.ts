import { NextRequest, NextResponse } from "next/server";
import { getWithdrawalById } from "@/server/services/withdrawal";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const withdrawalId = context.params.id?.trim();
  if (!withdrawalId) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  try {
    const result = await getWithdrawalById(withdrawalId);
    if (!result) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
