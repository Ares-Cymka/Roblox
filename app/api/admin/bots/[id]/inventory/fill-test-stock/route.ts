import { NextResponse } from "next/server";
import { fillBotTestStock } from "@/server/services/bot";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const result = await fillBotTestStock(params.id, 10);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      message: `Set test stock to at least ${result.minQuantity} for ${result.updated} item(s).`,
      ...result,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fill test stock" },
      { status: 500 }
    );
  }
}
