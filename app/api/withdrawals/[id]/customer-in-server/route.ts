import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { customerInServer } from "@/server/services/mm2-delivery";
import { getWithdrawalById } from "@/server/services/withdrawal";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  botAssignmentId: z.string().min(1, "botAssignmentId is required"),
});

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const withdrawalId = context.params.id?.trim();
  if (!withdrawalId) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const result = await customerInServer(withdrawalId, parsed.data.botAssignmentId);
  if ("error" in result) {
    const status = result.error === "Withdrawal not found" ? 404 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }

  // Return updated withdrawal data for the page to re-render
  const updated = await getWithdrawalById(withdrawalId);
  if (!updated) {
    return NextResponse.json({ error: "Withdrawal not found after update" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
