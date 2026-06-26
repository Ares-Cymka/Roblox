/**
 * POST /api/bot/jobs/[jobId]/trade-detected
 *
 * Bot agent reports that the customer accepted the in-game trade on screen.
 * Moves the MM2 session to TRADE_ACCEPTED so the customer UI can update.
 *
 * Authentication: Bearer <BOT_API_SECRET>
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isBotAuthorized } from "@/lib/bot-auth";
import { markBotTradeDetected } from "@/server/services/bot-delivery";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  detectedItems: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive(),
        itemId: z.string().optional(),
      })
    )
    .optional(),
  proofText: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyRaw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await markBotTradeDetected(params.jobId, parsed.data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: result.status });
}
