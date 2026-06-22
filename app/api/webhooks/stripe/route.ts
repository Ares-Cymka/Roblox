import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentFailed,
} from "@/server/services/order-checkout";
import { recordStripeEvent, stripeEventAlreadyProcessed } from "@/server/services/stripe-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Idempotency — skip events we've already processed
  const alreadyProcessed = await stripeEventAlreadyProcessed(event.id);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const result = await handleCheckoutSessionCompleted({
        id: session.id,
        metadata: session.metadata,
        payment_intent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        customer:
          typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      });

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }

      await recordStripeEvent(event.id, event.type);
      return NextResponse.json({
        received: true,
        orderId: result.order?.id,
        alreadyCredited: result.alreadyCredited ?? false,
      });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionExpired(session.id, session.metadata ?? null);
      await recordStripeEvent(event.id, event.type);
      return NextResponse.json({ received: true });
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntentFailed(pi.id);
      await recordStripeEvent(event.id, event.type);
      return NextResponse.json({ received: true });
    }

    // Unhandled event type — acknowledge and ignore
    await recordStripeEvent(event.id, event.type);
    return NextResponse.json({ received: true, ignored: event.type });
  } catch {
    return NextResponse.json({ error: "Internal server error processing webhook" }, { status: 500 });
  }
}
