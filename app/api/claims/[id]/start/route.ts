import { NextRequest, NextResponse } from "next/server";
import { startClaim } from "@/server/services/claim-start";

export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  "Claim not found": 404,
  "Claim already delivered": 409,
  "Claim expired": 410,
  "Invalid claim status": 409,
  "No bot available": 503,
  "Not enough bot inventory": 409,
};

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const claimId = context.params.id?.trim();

  if (!claimId) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  try {
    const result = await startClaim(claimId);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: ERROR_STATUS[result.error] ?? 400 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
