/**
 * POST /api/bot/callback
 *
 * Legacy/alternate bot callback — forwards to confirmBotTradeDelivery.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmBotTradeDelivery } from "@/server/services/bot-delivery";
import { markDeliveryJobFailed } from "@/server/services/admin-delivery";
import { addDeliveryProof } from "@/server/services/support-review";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  jobId: z.string().min(1),
  success: z.boolean(),
  message: z.string().min(1),
  proofText: z.string().optional(),
  proofImageUrl: z.string().url().optional(),
  detectedItems: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive(),
        itemId: z.string().optional(),
      })
    )
    .optional(),
});

function checkSecret(req: NextRequest): boolean {
  const secret = process.env.BOT_API_SECRET;
  if (!secret) {
    console.warn("[/api/bot/callback] BOT_API_SECRET is not set — rejecting request.");
    return false;
  }
  const provided =
    req.headers.get("x-bot-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return provided === secret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { jobId, success, message, proofText, proofImageUrl, detectedItems } =
    parsed.data;

  try {
    if (success) {
      const result = await confirmBotTradeDelivery(jobId, {
        detectedItems,
        proofText: proofText ?? message,
        proofImageUrl,
        requireDetection: Boolean(detectedItems?.length),
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      if (proofText) {
        await addDeliveryProof(jobId, proofText, proofImageUrl).catch(() => {});
      }
      return NextResponse.json({ ok: true, status: "DELIVERED" });
    }

    await markDeliveryJobFailed(jobId, message);
    return NextResponse.json({ ok: true, status: "FAILED" });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
