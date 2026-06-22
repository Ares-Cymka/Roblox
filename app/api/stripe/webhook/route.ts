// Alias — both /api/stripe/webhook and /api/webhooks/stripe are accepted.
// Configure either URL in the Stripe Dashboard.
import { POST } from "@/app/api/webhooks/stripe/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export { POST };
