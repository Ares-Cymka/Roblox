import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { markDeliveryJobRetryLater } from "@/server/services/admin-delivery";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().trim().min(3, "Reason is required").max(500),
  retryAfterMinutes: z.coerce.number().int().min(1).max(1440),
});

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const deliveryJobId = context.params.id?.trim();
  if (!deliveryJobId) {
    return NextResponse.json({ error: "Delivery job not found" }, { status: 404 });
  }

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
    const result = await markDeliveryJobRetryLater(
      deliveryJobId,
      parsed.data.reason,
      parsed.data.retryAfterMinutes
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to schedule retry" }, { status: 500 });
  }
}
