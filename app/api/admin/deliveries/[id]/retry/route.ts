import { NextRequest, NextResponse } from "next/server";
import { retryFailedDeliveryJob } from "@/server/services/admin-delivery";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const deliveryJobId = context.params.id?.trim();
  if (!deliveryJobId) {
    return NextResponse.json({ error: "Delivery job not found" }, { status: 404 });
  }

  try {
    const result = await retryFailedDeliveryJob(deliveryJobId);

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
      { error: "Failed to retry delivery" },
      { status: 500 }
    );
  }
}
