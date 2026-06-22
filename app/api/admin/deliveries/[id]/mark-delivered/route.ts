import { NextRequest, NextResponse } from "next/server";
import { markDeliveryJobDelivered } from "@/server/services/admin-delivery";

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
    const result = await markDeliveryJobDelivered(deliveryJobId);

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
      { error: "Failed to mark delivery as delivered" },
      { status: 500 }
    );
  }
}
