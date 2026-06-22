import { NextRequest, NextResponse } from "next/server";
import { markDeliveryJobFailed } from "@/server/services/admin-delivery";
import { markDeliveryFailedSchema } from "@/server/validators/delivery";

export const dynamic = "force-dynamic";

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

  const parsed = markDeliveryFailedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await markDeliveryJobFailed(
      deliveryJobId,
      parsed.data.reason
    );

    if ("error" in result) {
      const status =
        result.error === "Delivery job not found" ||
        result.error === "Bot assignment not found"
          ? 404
          : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to mark delivery as failed" },
      { status: 500 }
    );
  }
}
