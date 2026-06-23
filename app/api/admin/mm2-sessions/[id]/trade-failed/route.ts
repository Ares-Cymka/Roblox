import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mm2TradeFailed } from "@/server/services/mm2-delivery";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reason: z.string().max(500).optional().default(""),
});

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const sessionId = context.params.id?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // body is optional for this route
  }

  const parsed = bodySchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : "";

  const result = await mm2TradeFailed(sessionId, reason);
  if ("error" in result) {
    const status = result.error === "MM2 session not found" ? 404 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
