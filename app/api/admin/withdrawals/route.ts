import { NextResponse } from "next/server";
import { listWithdrawals } from "@/server/services/withdrawal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const withdrawals = await listWithdrawals();
    return NextResponse.json({ withdrawals });
  } catch {
    return NextResponse.json({ error: "Failed to load withdrawals" }, { status: 500 });
  }
}
