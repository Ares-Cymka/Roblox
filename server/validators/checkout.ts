import { z } from "zod";

export const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const createCheckoutSessionSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Select at least one item"),
  customerEmail: z.string().email().optional(),
  sessionId: z.string().trim().min(1).max(128).optional(),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
