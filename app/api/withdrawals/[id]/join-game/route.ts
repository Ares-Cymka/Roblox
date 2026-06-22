import { NextRequest, NextResponse } from "next/server";
import { joinWithdrawalGame } from "@/server/services/withdrawal";
import { botAssignmentActionSchema } from "@/server/validators/withdrawal";

export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  "Withdrawal not found": 404,
  "Bot assignment not found": 404,
  "Delivery job not found": 404,
  "Bot private server URL is not configured": 409,
  "Friend request must be sent before joining": 409,
  "Invalid bot assignment status": 409,
  "Withdrawal is delivered": 409,
  "Withdrawal is failed": 409,
  "Withdrawal is cancelled": 409,
  "Withdrawal is support required": 409,
};

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const withdrawalId = context.params.id?.trim();
  if (!withdrawalId) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = botAssignmentActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await joinWithdrawalGame(
      withdrawalId,
      parsed.data.botAssignmentId
    );

    if ("error" in result) {
      const status = ERROR_STATUS[result.error as keyof typeof ERROR_STATUS] ?? 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
