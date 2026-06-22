import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDeliveryProof } from "@/server/services/support-review";

export const dynamic = "force-dynamic";

const schema = z.object({
  proofText: z.string().trim().min(1, "Proof note is required").max(2000),
  proofImageUrl: z.string().url().optional().or(z.literal("")),
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
    const result = await addDeliveryProof(
      deliveryJobId,
      parsed.data.proofText,
      parsed.data.proofImageUrl || undefined
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to save proof" }, { status: 500 });
  }
}
