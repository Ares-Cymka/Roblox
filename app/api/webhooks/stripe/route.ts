import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getStripeClient,
  getStripeWebhookSecret,
} from "@/lib/stripe";
import { handleCheckoutSessionCompleted } from "@/server/services/order-checkout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const body = await request.text();

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret()
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const result = await handleCheckoutSessionCompleted({
        id: session.id,
        metadata: session.metadata,
        payment_intent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
      });

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }

      return NextResponse.json({
        received: true,
        orderId: result.order?.id,
        alreadyCredited: result.alreadyCredited ?? false,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to process checkout session" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true, ignored: event.type });
}
