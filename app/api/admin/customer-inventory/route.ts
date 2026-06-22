import { NextRequest, NextResponse } from "next/server";
import {
  createTestCustomerInventory,
  listCustomerInventories,
} from "@/server/services/customer-inventory";
import { createCustomerInventorySchema } from "@/server/validators/withdrawal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const inventories = await listCustomerInventories();
    return NextResponse.json({ inventories });
  } catch {
    return NextResponse.json(
      { error: "Failed to load customer inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createCustomerInventorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const inventory = await createTestCustomerInventory(parsed.data);
    return NextResponse.json({ inventory }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create inventory item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
