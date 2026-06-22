import { NextRequest, NextResponse } from "next/server";
import { claimLookupSchema } from "@/server/validators/order";
import { lookupClaimByCode } from "@/server/services/order";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = claimLookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid claim code" },
      { status: 400 }
    );
  }

  try {
    const result = await lookupClaimByCode(parsed.data.claimCode);
    if (!result) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
