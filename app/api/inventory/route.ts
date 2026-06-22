import { NextRequest, NextResponse } from "next/server";
import { inventoryLookupSchema } from "@/server/validators/withdrawal";
import { lookupCustomerInventory } from "@/server/services/customer-inventory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
  const testCode = request.nextUrl.searchParams.get("testCode") ?? undefined;
  const email = request.nextUrl.searchParams.get("email") ?? undefined;

  const parsed = inventoryLookupSchema.safeParse({ sessionId, testCode, email });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid lookup" },
      { status: 400 }
    );
  }

  try {
    const result = await lookupCustomerInventory(parsed.data);
    if (!result) {
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to load inventory" }, { status: 500 });
  }
}
