/**
 * POST /api/bot/callback
 *
 * Called by an external bot process or a Roblox Lua HttpService script to
 * report the result of an in-game delivery.
 *
 * This endpoint is the bridge between the real-world Roblox automation and
 * the RNGBLOX website backend. An external bot agent (e.g., a separate
 * Node.js/Python service running on a machine with a Roblox client, or a
 * Roblox server-side script) calls this after completing an in-game
 * trade/gift/mailbox delivery.
 *
 * Authentication:
 *   Requires the BOT_API_SECRET header to match the BOT_API_SECRET env var.
 *   Keep BOT_API_SECRET secret and never expose it on the client side.
 *
 * Body:
 *   {
 *     jobId:       string     — DeliveryJob.id
 *     success:     boolean    — true = delivered, false = failed
 *     message:     string     — human-readable result description
 *     proofText?:  string     — optional proof note
 *     proofImageUrl?: string  — optional proof image URL
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { markDeliveryJobDelivered, markDeliveryJobFailed } from "@/server/services/admin-delivery";
import { addDeliveryProof } from "@/server/services/support-review";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  jobId: z.string().min(1),
  success: z.boolean(),
  message: z.string().min(1),
  proofText: z.string().optional(),
  proofImageUrl: z.string().url().optional(),
});

function checkSecret(req: NextRequest): boolean {
  const secret = process.env.BOT_API_SECRET;
  if (!secret) {
    // If no secret is configured, reject all external callbacks for safety.
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

  const { jobId, success, message, proofText, proofImageUrl } = parsed.data;

  const job = await prisma.deliveryJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    if (success) {
      await markDeliveryJobDelivered(jobId);
      // Attach optional proof note
      if (proofText) {
        await addDeliveryProof(jobId, proofText, proofImageUrl).catch(() => {});
      }
      console.log(`[/api/bot/callback] Job ${jobId} marked DELIVERED via external callback.`);
      return NextResponse.json({ ok: true, status: "DELIVERED" });
    } else {
      await markDeliveryJobFailed(jobId, message);
      console.log(`[/api/bot/callback] Job ${jobId} marked FAILED via external callback: ${message}`);
      return NextResponse.json({ ok: true, status: "FAILED" });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[/api/bot/callback] Error processing job ${jobId}:`, err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
