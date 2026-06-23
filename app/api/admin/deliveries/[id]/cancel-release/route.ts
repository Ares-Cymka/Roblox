import { NextRequest, NextResponse } from "next/server";
import { cancelAndReleaseDeliveryJob } from "@/server/services/admin-delivery";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const deliveryJobId = context.params.id?.trim();
  if (!deliveryJobId) {
    return NextResponse.json({ error: "Delivery job not found" }, { status: 404 });
  }

  let reason: string | undefined;
  try {
    const body = await request.json();
    reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : undefined;
  } catch {
    // Body is optional for this quick admin action.
  }

  try {
    const result = await cancelAndReleaseDeliveryJob(deliveryJobId, reason);

    if ("error" in result) {
      const status = result.error === "Delivery job not found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to cancel and release delivery job" },
      { status: 500 }
    );
  }
}
