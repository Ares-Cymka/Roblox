import { NextRequest, NextResponse } from "next/server";
import { claimCodeSchema } from "@/server/validators/delivery";
import { getDeliveryByClaimCode } from "@/server/services/delivery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  const parsed = claimCodeSchema.safeParse(code ?? "");
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid claim code" },
      { status: 400 }
    );
  }

  try {
    const delivery = await getDeliveryByClaimCode(parsed.data);

    if (!delivery) {
      return NextResponse.json(
        { error: "No delivery found for this claim code" },
        { status: 404 }
      );
    }

    return NextResponse.json({ delivery });
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
