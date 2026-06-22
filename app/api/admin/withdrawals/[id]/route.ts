import { NextRequest, NextResponse } from "next/server";
import {
  approveWithdrawalSupport,
  cancelWithdrawal,
} from "@/server/services/withdrawal";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const withdrawalId = context.params.id?.trim();
  if (!withdrawalId) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (body.action === "approve_support") {
      const withdrawal = await approveWithdrawalSupport(withdrawalId);
      if (!withdrawal) {
        return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
      }
      return NextResponse.json({ withdrawal });
    }

    if (body.action === "cancel") {
      const withdrawal = await cancelWithdrawal(withdrawalId);
      if (!withdrawal) {
        return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
      }
      return NextResponse.json({ withdrawal });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update withdrawal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
