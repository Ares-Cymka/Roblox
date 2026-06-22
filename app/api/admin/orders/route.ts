import { NextRequest, NextResponse } from "next/server";
import { createTestOrderSchema } from "@/server/validators/order";
import { createTestOrder, listOrders } from "@/server/services/order";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = await listOrders();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createTestOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await createTestOrder(parsed.data);
    return NextResponse.json(
      {
        order: {
          id: result.order.id,
          orderCode: result.order.orderCode,
          status: result.order.status,
          customer: result.order.customer,
          itemCount: result.order.items.length,
        },
        claim: {
          id: result.claim.id,
          claimCode: result.claim.claimCode,
          status: result.claim.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
