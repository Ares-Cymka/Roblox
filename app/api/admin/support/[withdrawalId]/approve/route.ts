import { NextRequest, NextResponse } from "next/server";
import { approveSupportWithdrawal } from "@/server/services/support-review";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { withdrawalId: string };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { withdrawalId } = context.params;

  try {
    const result = await approveSupportWithdrawal(withdrawalId);

    if ("error" in result) {
      const status = result.error === "Withdrawal not found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to approve withdrawal" }, { status: 500 });
  }
}
