/**
 * POST /api/bot/jobs/[jobId]/complete
 *
 * Bot agent confirms the customer received the item(s) from the bot.
 * Requires detectedItems unless requireDetection=false (admin override).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isBotAuthorized } from "@/lib/bot-auth";
import { confirmBotTradeDelivery } from "@/server/services/bot-delivery";

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
  proofImageUrl: z.string().url().optional(),
  requireDetection: z.boolean().optional(),
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

  const result = await confirmBotTradeDelivery(params.jobId, parsed.data);
  if ("error" in result) {
    const message = result.error ?? "Delivery confirmation failed";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({
    success: true,
    jobId: params.jobId,
    status: result.status,
  });
}
