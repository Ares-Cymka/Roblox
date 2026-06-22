import { NextRequest, NextResponse } from "next/server";
import { createWithdrawalSchema } from "@/server/validators/withdrawal";
import { createWithdrawal } from "@/server/services/withdrawal";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createWithdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await createWithdrawal(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create withdrawal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
