import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSessionSchema } from "@/server/validators/checkout";
import { createCheckoutSession } from "@/server/services/order-checkout";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`checkout:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createCheckoutSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await createCheckoutSession(parsed.data);

    if ("error" in result) {
      const status =
        result.error === "Stripe is not configured" ? 503 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
