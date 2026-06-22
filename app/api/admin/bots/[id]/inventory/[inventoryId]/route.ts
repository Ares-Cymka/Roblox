import { NextRequest, NextResponse } from "next/server";
import { updateBotInventorySchema } from "@/server/validators/bot";
import {
  deleteBotInventoryItem,
  updateBotInventoryItem,
} from "@/server/services/bot";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string; inventoryId: string };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateBotInventorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const inventory = await updateBotInventoryItem(
      params.id,
      params.inventoryId,
      parsed.data
    );
    if (!inventory) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }
    return NextResponse.json({ inventory });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update inventory",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const inventory = await deleteBotInventoryItem(params.id, params.inventoryId);
    if (!inventory) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
