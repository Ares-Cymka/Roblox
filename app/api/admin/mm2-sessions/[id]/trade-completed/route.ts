import { NextRequest, NextResponse } from "next/server";
import { mm2TradeCompleted } from "@/server/services/mm2-delivery";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const sessionId = context.params.id?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const result = await mm2TradeCompleted(sessionId);
  if ("error" in result) {
    const status = result.error === "MM2 session not found" ? 404 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
