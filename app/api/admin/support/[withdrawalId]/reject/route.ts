import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rejectSupportWithdrawal } from "@/server/services/support-review";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().trim().min(1, "Reason is required").max(1000),
});

interface RouteContext {
  params: { withdrawalId: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { withdrawalId } = context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await rejectSupportWithdrawal(withdrawalId, parsed.data.reason);

    if ("error" in result) {
      const status = result.error === "Withdrawal not found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to reject withdrawal" }, { status: 500 });
  }
}
