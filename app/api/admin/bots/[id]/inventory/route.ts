import { NextRequest, NextResponse } from "next/server";
import { upsertBotInventorySchema } from "@/server/validators/bot";
import { upsertBotInventory } from "@/server/services/bot";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = upsertBotInventorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await upsertBotInventory(params.id, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ inventory: result.inventory }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save bot inventory" },
      { status: 500 }
    );
  }
}
